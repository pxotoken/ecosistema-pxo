import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { getChainConfig } from '../config/chains.js';
import type { PaymentRepository } from '../models/Payment.js';
import type { MerchantService } from './MerchantService.js';
import type { QRService } from './QRService.js';
import type { BlockchainService, VerifiedTransfer } from './BlockchainService.js';
import type { WebhookService } from './WebhookService.js';
import { buildEIP681Uri } from '../lib/eip681.js';
import type {
  CreateChargeIntentRequest,
  CreateChargeIntentResponse,
  GeneratePaymentRequest,
  GeneratePaymentResponse,
  Payment,
  PaymentStatusResponse,
  PendingChargeResponse,
} from '../types/payment.js';
import type { Merchant, POSDevice } from '../types/merchant.js';

export interface GenerateContext {
  merchant: Merchant;
  pos: POSDevice;
}

export class LivePullIntentExistsError extends Error {
  constructor(public readonly clientWallet: string) {
    super(`A live PULL intent already exists for client wallet ${clientWallet}`);
    this.name = 'LivePullIntentExistsError';
  }
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly merchants: MerchantService,
    private readonly qr: QRService,
    blockchain: BlockchainService,
    private readonly webhooks: WebhookService,
  ) {
    // Reserved for future on-chain lookups at confirmation time; today the
    // webhook route and ReconciliationService query the chain directly.
    void blockchain;
  }

  async generate(
    request: GeneratePaymentRequest,
    context: GenerateContext,
  ): Promise<GeneratePaymentResponse> {
    const chain = getChainConfig();
    if (!chain.pxoTokenAddress) {
      throw new Error(`PXO token address not configured for chain ${chain.chainId}`);
    }

    // Paridad 1:1 MXN → PXO. Unidades base = amount * 10**decimals.
    const amountPXO = BigInt(Math.round(request.amount * 10 ** chain.pxoDecimals)).toString();
    const paymentId = randomUUID();
    const expiresAt = new Date(Date.now() + env.PAYMENT_TTL_MINUTES * 60_000);

    const qrRaw = buildEIP681Uri({
      contractAddress: chain.pxoTokenAddress,
      merchantWallet: context.merchant.walletAddress,
      amountPXO,
      label: request.reference ? `PXO Pay - ${request.reference}` : 'PXO Pay',
      paymentId,
      chainId: chain.chainId,
    });
    const qrData = await this.qr.generateQR(qrRaw);

    await this.payments.create({
      id: paymentId,
      merchantId: request.merchantId,
      posId: request.posId,
      direction: 'PUSH',
      amountMXN: request.amount,
      amountPXO,
      merchantWallet: context.merchant.walletAddress,
      reference: request.reference,
      chainId: chain.chainId,
      expiresAt,
    });

    return {
      paymentId,
      qrData,
      qrRaw,
      walletAddress: context.merchant.walletAddress,
      amountPXO,
      amountMXN: request.amount,
      expiresAt: expiresAt.toISOString(),
      chainId: chain.chainId,
    };
  }

  // Flujo PULL: el comercio escanea el QR del cliente y dispara un intento de
  // cobro. Crea un `payment` con direction=PULL en estado PENDING (sin tx_hash
  // todavía) y TTL corto para que la app del cliente lo detecte por polling.
  async createIntent(
    request: CreateChargeIntentRequest,
    context: GenerateContext,
  ): Promise<CreateChargeIntentResponse> {
    const chain = getChainConfig();
    if (!chain.pxoTokenAddress) {
      throw new Error(`PXO token address not configured for chain ${chain.chainId}`);
    }

    const clientWallet = request.clientWalletAddress.toLowerCase();
    if (!EVM_ADDRESS_RE.test(clientWallet)) {
      throw new Error('Invalid clientWalletAddress');
    }

    // Idempotencia: rechazamos crear un segundo intent activo para la misma
    // wallet. Esto evita que el cliente vea múltiples modales encolados.
    const live = await this.payments.findLivePullIntentByClient(clientWallet);
    if (live) throw new LivePullIntentExistsError(clientWallet);

    const amountPXO = BigInt(Math.round(request.amount * 10 ** chain.pxoDecimals)).toString();
    const chargeId = randomUUID();
    const expiresAt = new Date(Date.now() + env.CHARGE_INTENT_TTL_SECONDS * 1000);

    await this.payments.create({
      id: chargeId,
      merchantId: request.merchantId,
      posId: request.posId,
      direction: 'PULL',
      amountMXN: request.amount,
      amountPXO,
      merchantWallet: context.merchant.walletAddress,
      clientWallet,
      reference: request.reference,
      chainId: chain.chainId,
      expiresAt,
    });

    return {
      chargeId,
      amountPXO,
      amountMXN: request.amount,
      expiresAt: expiresAt.toISOString(),
      chainId: chain.chainId,
      merchantWallet: context.merchant.walletAddress,
      clientWallet,
    };
  }

  async getPendingForClient(clientWallet: string): Promise<PendingChargeResponse | null> {
    const normalized = clientWallet.toLowerCase();
    if (!EVM_ADDRESS_RE.test(normalized)) return null;

    const pending = await this.payments.findPendingPullForClient(normalized);
    if (!pending) return null;

    const merchant = await this.merchants.getById(pending.merchantId);
    return {
      chargeId: pending.id,
      merchantId: pending.merchantId,
      merchantName: merchant?.name,
      merchantWallet: pending.merchantWallet,
      amountMXN: pending.amountMXN,
      amountPXO: pending.amountPXO,
      reference: pending.reference,
      expiresAt: pending.expiresAt.toISOString(),
      chainId: pending.chainId,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatusResponse | null> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) return null;

    // Opportunistic expiry on read.
    let effective = payment;
    if (payment.status === 'PENDING' && payment.expiresAt.getTime() < Date.now()) {
      await this.payments.expirePending();
      const refreshed = await this.payments.findById(paymentId);
      if (refreshed) effective = refreshed;
    }

    return toStatusResponse(effective);
  }

  /**
   * Process a verified on-chain Transfer event and move the matching payment
   * to CONFIRMED. Fires the merchant callback if configured.
   *
   * Returns the updated payment on success, or null if no matching PENDING
   * payment was found (in which case the transfer is treated as unrelated).
   */
  async handleVerifiedTransfer(
    txHash: string,
    transfer: VerifiedTransfer,
  ): Promise<Payment | null> {
    const chain = getChainConfig();
    if (transfer.contractAddress.toLowerCase() !== chain.pxoTokenAddress.toLowerCase()) {
      return null;
    }

    // PULL es más específico (from + to + amount) — probamos primero. Si no hay
    // match, caemos al lookup PUSH (solo to + amount). Esto evita que un PULL
    // pendiente sea "robado" por un Transfer fortuito hacia el mismo comercio
    // por el mismo monto, y viceversa.
    const pending =
      (await this.payments.findPendingByFromToAndAmount(
        transfer.from,
        transfer.to,
        transfer.value,
        chain.chainId,
      )) ??
      (await this.payments.findPendingByWalletAndAmount(
        transfer.to,
        transfer.value,
        chain.chainId,
      ));
    if (!pending) return null;

    if (pending.expiresAt.getTime() < Date.now()) {
      // Late arrival — mark failed (don't auto-confirm outside TTL).
      await this.payments.markFailed(pending.id);
      return null;
    }

    const confirmed = await this.payments.markConfirmed(pending.id, txHash, transfer.from);
    if (!confirmed) return null;

    // Merchant callback (best-effort).
    const merchant = await this.merchants.getById(confirmed.merchantId);
    if (merchant?.callbackUrl) {
      void this.webhooks.notifyPos(merchant.callbackUrl, {
        paymentId: confirmed.id,
        status: 'CONFIRMED',
        txHash: confirmed.txHash ?? txHash,
        confirmedAt: confirmed.confirmedAt?.toISOString() ?? new Date().toISOString(),
        amountMXN: confirmed.amountMXN,
        amountPXO: confirmed.amountPXO,
        reference: confirmed.reference,
      });
    }

    return confirmed;
  }

  async recordClientTxHash(
    paymentId: string,
    txHash: string,
    clientWallet: string,
  ): Promise<{ recorded: boolean; alreadyHasTx: boolean }> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) return { recorded: false, alreadyHasTx: false };
    if (payment.status !== 'PENDING') return { recorded: false, alreadyHasTx: !!payment.txHash };
    if (payment.txHash) return { recorded: false, alreadyHasTx: true };

    const updated = await this.payments.recordClientTxHash(paymentId, txHash, clientWallet);
    return { recorded: !!updated, alreadyHasTx: false };
  }

  async expirePending(): Promise<number> {
    return this.payments.expirePending();
  }

  async listPendingWithTxHash(): Promise<Payment[]> {
    return this.payments.listPendingWithTxHash();
  }
}

function toStatusResponse(p: Payment): PaymentStatusResponse {
  return {
    paymentId: p.id,
    status: p.status,
    direction: p.direction,
    txHash: p.txHash,
    confirmedAt: p.confirmedAt?.toISOString(),
    amountMXN: p.amountMXN,
    amountPXO: p.amountPXO,
    merchantWallet: p.merchantWallet,
    clientWallet: p.clientWallet,
    reference: p.reference,
    chainId: p.chainId,
    expiresAt: p.expiresAt.toISOString(),
  };
}


import type { BlockchainService } from './BlockchainService.js';
import type { PaymentService } from './PaymentService.js';

export class ReconciliationService {
  constructor(
    private readonly payments: PaymentService,
    private readonly blockchain: BlockchainService,
  ) {}

  /**
   * For every PENDING payment that already has a txHash recorded (e.g. set by
   * the client before the webhook arrived), re-check the receipt on-chain and
   * promote it to CONFIRMED if the transfer landed.
   *
   * Also batch-expires anything past TTL.
   */
  async reconcilePendingPayments(): Promise<{ reconciled: number; expired: number }> {
    const expired = await this.payments.expirePending();
    const pending = await this.payments.listPendingWithTxHash();

    let reconciled = 0;
    for (const payment of pending) {
      if (!payment.txHash) continue;
      const transfer = await this.blockchain.verifyTransaction(payment.txHash);
      if (!transfer) continue;
      const result = await this.payments.handleVerifiedTransfer(payment.txHash, transfer);
      if (result) reconciled += 1;
    }

    return { reconciled, expired };
  }
}

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getContract, readContract, toUnits, toTokens } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt, eth_getTransactionByHash } from 'thirdweb/rpc';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerSupabase } from '../lib/supabase.js';
import { getServerThirdwebClient } from '../lib/thirdweb-client.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import {
  PXO_TOKEN_ADDRESSES,
  PXO_RECEIVER_ADDRESSES,
  PXO_SELL_SUPPORTED_CHAIN_IDS,
  PXO_DECIMALS,
  type SupportedChainId,
} from '../config/chains.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * The PXO contract caps its transfer fee at `require(newBasisPoints < 20)`, so
 * a transfer can never deliver less than 99.8% of the amount sent. The fee is 0
 * today, but a FEE_SETTER can switch it on without telling us, and the deployed
 * bytecode is unverified (SL-009) — so we accept a shortfall up to the cap and
 * credit what actually arrived. Anything shorter than that is not a fee, it is
 * a different transfer, and it must not silently become a smaller certificate.
 */
const MAX_FEE_BASIS_POINTS = 20n;

/** Accepts "100", "100.5", ".5" — not "1e3", "-1" or "". */
const DECIMAL_RE = /^(?:\d+(?:\.\d+)?|\.\d+)$/;

interface CreateLockBody {
  /** Decimal string, not a number: JSON floats lose precision on a MAX-filled balance. */
  pxoAmount?: string | number;
  termId?: string;
  chainId?: number;
  /** Which catalogue product this certificate belongs to. */
  investmentTypeId?: string;
}

interface ConfirmLockBody {
  transactionHash?: string;
  userAddress?: string;
}

type RpcLog = { address?: string; topics?: readonly string[]; data?: string };

/** Lifted verbatim from sell-pxo-mxn.ts — same log, same shape. */
function parseTransferLog(log: RpcLog, pxoContractAddress: string) {
  const addr = (log.address || '').toLowerCase();
  if (addr !== pxoContractAddress.toLowerCase()) return null;
  const topics = log.topics || [];
  if (topics[0] !== TRANSFER_TOPIC) return null;
  const toAddress = topics[2] ? '0x' + topics[2].slice(-40) : null;
  const value = log.data && log.data !== '0x' ? BigInt(log.data) : null;
  return { toAddress: toAddress?.toLowerCase(), value };
}

/**
 * Fixed-term PXO certificates (CD).
 *
 * Flow, deliberately the same shape as sell-pxo-mxn:
 *   1) GET  /cd/terms                  — dropdown contents
 *   2) POST /cd/locks                  — create the certificate as AWAITING_PXO,
 *                                        return the treasury address
 *   3) (user signs a PXO transfer to the treasury wallet)
 *   4) POST /cd/locks/:id/confirm      — verify the transfer on-chain, then
 *                                        activate the certificate
 *   5) GET  /cd/locks                  — the caller's certificates
 *
 * The record is created BEFORE the money moves, so an abandoned signature
 * leaves a visible AWAITING_PXO row rather than a transfer nobody can explain.
 *
 * `/confirm` verifies the transfer against the chain instead of trusting the
 * hash the client hands it. That is not optional here: SL-025 is the same
 * endpoint shape in /buy-pxo trusting a client-supplied hash and sending PXO
 * against a payment nobody checked.
 *
 * There is no on-chain lock. The principal sits in the ordinary treasury hot
 * wallet, indistinguishable on-chain from working float, and only the
 * `pxo_cetes_cd` row says it is owed back. Paying it back is task #3.
 */
export const cdRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Step 1: the maturity terms on offer.
  app.get('/cd/terms', { preHandler: requireCaller }, async (req, reply) => {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('maturity_terms')
      .select('id, label, term_days, baseline_annual_yield_percent')
      .eq('is_active', true)
      .order('term_days');

    if (error) {
      req.log.error({ err: error }, 'cd/terms: list failed');
      return reply.code(500).send({ error: 'Failed to load maturity terms' });
    }
    return reply.send({ success: true, data: data ?? [] });
  });

  // Step 5 (listed here, used by the screen after a lock): the caller's certificates.
  app.get('/cd/locks', { preHandler: requireCaller }, async (req, reply) => {
    const supabase = getServerSupabase();
    const user = await getUserByWallet(req.caller!.walletAddress);
    if (!user) return reply.code(401).send({ error: 'Authentication required' });

    const { data, error } = await supabase
      .from('pxo_cetes_cd')
      .select(
        'id, requested_pxo, principal_pxo, term_days, annual_yield_percent, status, chain_id, investment_type_id, lock_tx_hash, deposit_date, maturity_date, failure_reason, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      req.log.error({ err: error }, 'cd/locks: list failed');
      return reply.code(500).send({ error: 'Failed to load certificates' });
    }
    return reply.send({ success: true, data: data ?? [] });
  });

  // Step 2: create the certificate, unfunded.
  app.post<{ Body: CreateLockBody }>(
    '/cd/locks',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const user = await getUserByWallet(req.caller!.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      // Same gate as the MXN off-ramp: locking funds for a year is at least as
      // sensitive as withdrawing them.
      if (user.kyc_status !== 'VALIDATED') {
        return reply.code(403).send({
          error: 'KYC validation required',
          message: 'Debes completar y validar tu KYC para poder invertir PXO a plazo',
        });
      }

      const { pxoAmount, termId, chainId, investmentTypeId } = req.body ?? {};
      if (pxoAmount === undefined || !termId || !chainId) {
        return reply
          .code(400)
          .send({ error: 'pxoAmount, termId and chainId are required' });
      }

      const amountStr = String(pxoAmount).trim();
      if (!DECIMAL_RE.test(amountStr) || Number(amountStr) <= 0) {
        return reply.code(400).send({ error: 'pxoAmount must be a positive decimal amount' });
      }
      if (!PXO_SELL_SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)) {
        return reply.code(400).send({ error: `Unsupported chain ID: ${chainId}` });
      }

      const resolvedChainId = chainId as SupportedChainId;
      const treasuryAddress = PXO_RECEIVER_ADDRESSES[resolvedChainId];
      if (!treasuryAddress) {
        return reply.code(500).send({ error: 'Treasury address not configured for chain' });
      }

      const { data: term, error: termError } = await supabase
        .from('maturity_terms')
        .select('id, label, term_days, baseline_annual_yield_percent')
        .eq('id', termId)
        .eq('is_active', true)
        .maybeSingle();
      if (termError) {
        req.log.error({ err: termError }, 'cd/locks: term lookup failed');
        return reply.code(500).send({ error: 'Lookup failed' });
      }
      if (!term) return reply.code(400).send({ error: 'Unknown or inactive maturity term' });

      // Optional, and validated when present. Nullable in the schema because
      // certificates predate the catalogue; a bogus id is still rejected rather
      // than stored, so the product a certificate belongs to is either right or
      // absent, never wrong.
      if (investmentTypeId) {
        const { data: investmentType, error: typeError } = await supabase
          .from('investment_types')
          .select('id')
          .eq('id', investmentTypeId)
          .eq('is_active', true)
          .maybeSingle();
        if (typeError) {
          req.log.error({ err: typeError }, 'cd/locks: investment type lookup failed');
          return reply.code(500).send({ error: 'Lookup failed' });
        }
        if (!investmentType) {
          return reply.code(400).send({ error: 'Unknown or inactive investment type' });
        }
      }

      const { data: cd, error } = await supabase
        .from('pxo_cetes_cd')
        .insert({
          user_id: user.id,
          requested_pxo: amountStr,
          term_id: term.id,
          // Snapshot the term the user was shown. Re-reading maturity_terms at
          // maturity would reprice a certificate someone already committed to.
          term_days: term.term_days,
          annual_yield_percent: term.baseline_annual_yield_percent,
          chain_id: resolvedChainId,
          investment_type_id: investmentTypeId ?? null,
          status: 'AWAITING_PXO',
        })
        .select()
        .single();
      if (error) {
        req.log.error({ err: error }, 'cd/locks: create failed');
        return reply.code(500).send({ error: 'Failed to create the certificate' });
      }

      return reply.send({
        success: true,
        cdId: cd.id,
        treasuryAddress,
        chainId: resolvedChainId,
        pxoAmount: amountStr,
        termLabel: term.label,
        termDays: term.term_days,
        annualYieldPercent: Number(term.baseline_annual_yield_percent),
        status: cd.status,
        message:
          'Certificate created. Transfer the PXO to the treasury address on-chain, then call /confirm with the transaction hash.',
      });
    },
  );

  // Step 4: verify the on-chain leg and activate.
  app.post<{ Body: ConfirmLockBody; Params: { id: string } }>(
    '/cd/locks/:id/confirm',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const user = await getUserByWallet(req.caller!.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      const { transactionHash, userAddress } = req.body ?? {};
      if (!transactionHash || !userAddress) {
        return reply.code(400).send({ error: 'transactionHash and userAddress are required' });
      }

      const { data: cd, error: cdError } = await supabase
        .from('pxo_cetes_cd')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cdError) {
        req.log.error({ err: cdError }, 'cd/confirm: lookup failed');
        return reply.code(500).send({ error: 'Lookup failed' });
      }
      if (!cd) return reply.code(404).send({ error: 'Certificate not found' });
      if (cd.status !== 'AWAITING_PXO') {
        // Idempotent replay: the frontend retries this call, and a second
        // /confirm must not re-verify or re-activate anything.
        return reply.send({
          success: true,
          status: cd.status,
          maturityDate: cd.maturity_date,
          principalPxo: cd.principal_pxo,
          message: 'Certificate already funded',
        });
      }

      // The chain the certificate was created on — read back, never defaulted.
      const resolvedChainId = cd.chain_id as SupportedChainId;
      const chain = CHAIN_MAP[resolvedChainId];
      const pxoContractAddress = PXO_TOKEN_ADDRESSES[resolvedChainId];
      const treasuryAddress = PXO_RECEIVER_ADDRESSES[resolvedChainId];
      if (!chain || !pxoContractAddress || !treasuryAddress) {
        return reply.code(500).send({ error: `Chain ${resolvedChainId} not configured` });
      }

      const client = getServerThirdwebClient();
      if (!client) return reply.code(500).send({ error: 'Server client not available' });

      const rpcRequest = getRpcClient({ client, chain });

      const tx = await eth_getTransactionByHash(rpcRequest, {
        hash: transactionHash as `0x${string}`,
      });
      if (!tx) return reply.code(400).send({ error: 'Transaction not found' });

      let receipt: Awaited<ReturnType<typeof eth_getTransactionReceipt>> | null = null;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        try {
          receipt = await eth_getTransactionReceipt(rpcRequest, {
            hash: transactionHash as `0x${string}`,
          });
          if (receipt && receipt.status === 'success') break;
          if (receipt && receipt.status === 'reverted') {
            return reply.code(400).send({ error: 'Transaction failed on chain' });
          }
        } catch (err) {
          req.log.debug({ err }, 'cd/confirm: receipt poll');
        }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      if (!receipt || receipt.status !== 'success') {
        return reply.code(400).send({
          error:
            'Transaction not confirmed yet. Please wait a moment and try again — your funds have not been locked.',
        });
      }

      const txFrom = (tx.from || '').toLowerCase();
      const txTo = (tx.to || '').toLowerCase();
      if (txFrom !== userAddress.toLowerCase()) {
        return reply
          .code(400)
          .send({ error: 'Transaction was not sent from the provided user address' });
      }
      if (txTo !== pxoContractAddress.toLowerCase()) {
        return reply.code(400).send({ error: 'Transaction is not a PXO transfer' });
      }

      // Decimals differ per deployment — 6 on mainnet, 8 on Amoy — so they are
      // read, and the fallback is the verified constant rather than 18.
      let decimals = PXO_DECIMALS[resolvedChainId];
      try {
        const pxoContract = getContract({ address: pxoContractAddress, client, chain });
        decimals = Number(
          await readContract({
            contract: pxoContract,
            method: 'function decimals() view returns (uint8)',
            params: [],
          }),
        );
      } catch (err) {
        req.log.warn(
          { err, fallback: decimals },
          'cd/confirm: decimals read failed, using configured value',
        );
      }

      const requestedRaw = toUnits(String(cd.requested_pxo), decimals);
      const minAcceptableRaw =
        requestedRaw - (requestedRaw * MAX_FEE_BASIS_POINTS) / 10000n;
      const expectedReceiver = treasuryAddress.toLowerCase();

      // Credit what arrived, not what was asked for. Several Transfer logs can
      // appear in one transaction (the fee leg is one), so take the largest
      // transfer into the treasury.
      let receivedRaw = 0n;
      for (const log of receipt.logs || []) {
        const parsed = parseTransferLog(log, pxoContractAddress);
        if (!parsed) continue;
        if (parsed.toAddress === expectedReceiver && parsed.value !== null) {
          if (parsed.value > receivedRaw) receivedRaw = parsed.value;
        }
      }

      if (receivedRaw === 0n) {
        return reply
          .code(400)
          .send({ error: 'No PXO transfer to the treasury found in this transaction' });
      }
      if (receivedRaw < minAcceptableRaw) {
        req.log.error(
          { cdId: cd.id, transactionHash, requestedRaw: String(requestedRaw), receivedRaw: String(receivedRaw) },
          'cd/confirm: transfer is short by more than the contract fee cap',
        );
        return reply.code(400).send({
          error:
            'The PXO that reached the treasury is less than the amount for this certificate. Nothing was locked — contact support with your transaction hash.',
        });
      }

      const principalPxo = toTokens(receivedRaw, decimals);
      const depositDate = new Date();
      const maturityDate = new Date(depositDate);
      maturityDate.setUTCDate(maturityDate.getUTCDate() + Number(cd.term_days));

      // Atomic claim: AWAITING_PXO → ACTIVE, conditional on still being
      // AWAITING_PXO. Two concurrent /confirm calls cannot both activate, and
      // the unique index on lock_tx_hash stops one transfer funding two
      // certificates even across rows.
      const { data: claimed, error: claimError } = await supabase
        .from('pxo_cetes_cd')
        .update({
          status: 'ACTIVE',
          principal_pxo: principalPxo,
          user_address: userAddress,
          lock_tx_hash: transactionHash,
          deposit_date: depositDate.toISOString(),
          maturity_date: maturityDate.toISOString(),
        })
        .eq('id', cd.id)
        .eq('status', 'AWAITING_PXO')
        .select()
        .maybeSingle();
      if (claimError) {
        // 23505 on lock_tx_hash means this transfer already funded a different
        // certificate — reachable by opening two intents and confirming both
        // with one hash. That is the caller's mistake, not a reconciliation
        // problem, and it deserves a sentence rather than a 500.
        if (claimError.code === '23505') {
          return reply.code(400).send({
            error: 'This transaction has already funded another certificate.',
          });
        }
        req.log.error(
          { err: claimError, cdId: cd.id, transactionHash },
          'cd/confirm: activation failed AFTER the PXO reached the treasury — manual reconciliation required',
        );
        return reply.code(500).send({
          error:
            'Your transfer arrived but the certificate could not be activated. Support has been notified — do not resend.',
        });
      }
      if (!claimed) {
        return reply.send({ success: true, status: 'ACTIVE', message: 'Already funded' });
      }

      // Best-effort ledger entry so the lock shows up in transaction history,
      // mirroring sell-pxo-mxn. A failure here is not worth failing the call
      // over: the certificate itself is the record that matters.
      const { error: txError } = await supabase.from('transactions').insert({
        destination_type: 'wallet',
        destination_uuid: treasuryAddress,
        from_type: 'user',
        from_uuid: user.id,
        tx_hash: transactionHash,
        amount: principalPxo,
        state: 'PAGO_FINALIZADO',
      });
      if (txError) {
        req.log.warn({ err: txError, cdId: cd.id }, 'cd/confirm: history insert failed');
      }

      return reply.send({
        success: true,
        cdId: claimed.id,
        status: claimed.status,
        principalPxo,
        requestedPxo: String(cd.requested_pxo),
        termDays: claimed.term_days,
        annualYieldPercent: Number(claimed.annual_yield_percent),
        depositDate: claimed.deposit_date,
        maturityDate: claimed.maturity_date,
      });
    },
  );
};

import { getContract, readContract } from 'thirdweb';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerSupabase } from '../lib/supabase.js';
import { getServerThirdwebClient } from '../lib/thirdweb-client.js';
import { sendPXOToUser } from '../lib/send-pxo.js';
import { bitsoGetFundings, extractSenderClabe, BITSO_COMPLETE_STATUSES } from '../lib/bitso.js';
import { PXO_TOKEN_ADDRESSES, type SupportedChainId } from '../config/chains.js';
import { env } from '../config/env.js';
import type { FastifyBaseLogger } from 'fastify';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

interface DepositIntentRow {
  id: string;
  user_id: string;
  mxn_amount: number;
  pxo_amount: number;
  source_clabe: string;
  chain_id: SupportedChainId;
  user_address: string;
  trading_order_id: string | null;
}

/**
 * Background worker that reconciles incoming Bitso SPEI fundings with open
 * deposit_intents. Runs on a fixed interval (env.DEPOSIT_MATCH_WORKER_INTERVAL_MS).
 *
 * Responsibilities per tick:
 *   1) Expire PENDING intents past their TTL.
 *   2) Pull recent Bitso fundings.
 *   3) For each unmatched funding: find a PENDING intent owned by a user
 *      whose registered CLABE equals the funding's sender_clabe. Oldest wins
 *      (FIFO). If matched: claim atomically, issue PXO on-chain, mark COMPLETED.
 *
 * Idempotency: bitso_funding_id has a partial unique index, so a re-tick that
 * tries to re-match a funding fails cleanly at insert-time (we ignore that error).
 *
 * Kept intentionally simple — no exponential backoff, no retry queue, no
 * dead-letter. Failures log and leave intent in FAILED for manual review.
 */
export function startDepositMatchingWorker(log: FastifyBaseLogger): { stop: () => void } {
  if (!env.DEPOSIT_MATCH_WORKER_ENABLED) {
    log.info('deposit-matching-worker: disabled by env (DEPOSIT_MATCH_WORKER_ENABLED=false)');
    return { stop: () => {} };
  }

  let running = false;
  const tick = async () => {
    if (running) {
      log.debug('deposit-matching-worker: previous tick still running, skipping');
      return;
    }
    running = true;
    try {
      await expireStaleIntents(log);
      await matchFundings(log);
    } catch (err) {
      log.error({ err }, 'deposit-matching-worker: tick failed');
    } finally {
      running = false;
    }
  };

  const intervalId = setInterval(tick, env.DEPOSIT_MATCH_WORKER_INTERVAL_MS);
  // Kick off one tick immediately at boot so we don't wait a full interval.
  tick().catch((err) => log.error({ err }, 'deposit-matching-worker: initial tick failed'));

  log.info(
    { intervalMs: env.DEPOSIT_MATCH_WORKER_INTERVAL_MS },
    'deposit-matching-worker: started',
  );

  return {
    stop: () => {
      clearInterval(intervalId);
      log.info('deposit-matching-worker: stopped');
    },
  };
}

async function expireStaleIntents(log: FastifyBaseLogger): Promise<void> {
  const supabase = getServerSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('deposit_intents')
    .update({ status: 'EXPIRED', failure_reason: 'TTL exceeded without matching funding' })
    .eq('status', 'PENDING')
    .lt('expires_at', nowIso)
    .select('id, trading_order_id');
  if (error) {
    log.error({ err: error }, 'deposit-matching-worker: expire sweep failed');
    return;
  }
  if (!data || data.length === 0) return;

  // Cascade: mark linked trading_orders as EXPIRED too.
  const orderIds = data.map((row) => row.trading_order_id).filter(Boolean) as string[];
  if (orderIds.length > 0) {
    await supabase
      .from('trading_orders')
      .update({ status: 'EXPIRED' })
      .in('id', orderIds)
      .in('status', ['OPEN', 'PROCESSING']);
  }
  log.info({ count: data.length }, 'deposit-matching-worker: intents expired');
}

async function matchFundings(log: FastifyBaseLogger): Promise<void> {
  const fundings = await bitsoGetFundings({ limit: 50 });
  if (fundings.length === 0) return;

  const supabase = getServerSupabase();

  for (const funding of fundings) {
    if (!BITSO_COMPLETE_STATUSES.has(funding.status)) continue;
    if (funding.currency.toLowerCase() !== 'mxn') continue;

    const senderClabe = extractSenderClabe(funding);
    if (!senderClabe) {
      log.debug({ fid: funding.fid }, 'deposit-matching-worker: no sender_clabe in details');
      continue;
    }

    // Skip if this funding has already been tied to an intent.
    const { data: alreadyMatched } = await supabase
      .from('deposit_intents')
      .select('id')
      .eq('bitso_funding_id', funding.fid)
      .maybeSingle();
    if (alreadyMatched) continue;

    // Find the user registered under this CLABE. Case-sensitive column.
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('"CLABE"', senderClabe)
      .maybeSingle();
    if (userErr) {
      log.warn({ err: userErr, fid: funding.fid }, 'deposit-matching-worker: user lookup failed');
      continue;
    }
    if (!userRow) {
      log.info(
        { fid: funding.fid, senderClabe: `****${senderClabe.slice(-4)}` },
        'deposit-matching-worker: sender_clabe not registered to any user',
      );
      continue;
    }

    // FIFO: oldest PENDING intent for this user's CLABE.
    const { data: intent, error: intentErr } = await supabase
      .from('deposit_intents')
      .select('id, user_id, mxn_amount, pxo_amount, source_clabe, chain_id, user_address, trading_order_id')
      .eq('user_id', userRow.id)
      .eq('source_clabe', senderClabe)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (intentErr) {
      log.warn(
        { err: intentErr, fid: funding.fid },
        'deposit-matching-worker: intent lookup failed',
      );
      continue;
    }
    if (!intent) {
      log.debug(
        { fid: funding.fid, userId: userRow.id },
        'deposit-matching-worker: funding arrived without a pending intent',
      );
      continue;
    }

    await fulfillIntent(intent as DepositIntentRow, funding.fid, log);
  }
}

async function fulfillIntent(
  intent: DepositIntentRow,
  fundingId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const supabase = getServerSupabase();

  // Atomic claim: only proceed if still PENDING and no other funding attached.
  // The bitso_funding_id partial unique index prevents double-claim.
  const { data: claimed, error: claimError } = await supabase
    .from('deposit_intents')
    .update({ status: 'MATCHED', bitso_funding_id: fundingId })
    .eq('id', intent.id)
    .eq('status', 'PENDING')
    .select()
    .maybeSingle();

  if (claimError) {
    // Unique violation on bitso_funding_id means another tick beat us to it — safe to skip.
    if (claimError.code === '23505') {
      log.debug({ fid: fundingId, intentId: intent.id }, 'deposit-matching-worker: claim race lost');
      return;
    }
    log.error(
      { err: claimError, fid: fundingId, intentId: intent.id },
      'deposit-matching-worker: claim failed',
    );
    return;
  }
  if (!claimed) {
    log.debug(
      { intentId: intent.id },
      'deposit-matching-worker: intent no longer PENDING at claim time',
    );
    return;
  }

  const selectedChain = CHAIN_MAP[intent.chain_id];
  const pxoContractAddress = PXO_TOKEN_ADDRESSES[intent.chain_id];
  if (!selectedChain || !pxoContractAddress) {
    log.error({ chainId: intent.chain_id }, 'deposit-matching-worker: chain not configured');
    await markIntentFailed(intent, 'Chain not configured', log);
    return;
  }

  // Read on-chain decimals for atomic-unit math rather than assuming 18 — PXO
  // is a 6-decimal token (see SL-013 for where the frontend gets this wrong).
  let decimals = 18;
  try {
    const client = getServerThirdwebClient();
    if (client) {
      const pxoContract = getContract({ address: pxoContractAddress, client, chain: selectedChain });
      const onChainDecimals = await readContract({
        contract: pxoContract,
        method: 'function decimals() view returns (uint8)',
        params: [],
      });
      decimals = Number(onChainDecimals);
    }
  } catch (err) {
    log.warn({ err }, 'deposit-matching-worker: PXO decimals read failed, using 18');
  }

  const pxoQuantity = BigInt(Math.floor(Number(intent.pxo_amount) * 10 ** decimals));

  let pxoTxHash: string;
  try {
    const result = await sendPXOToUser({
      quantity: pxoQuantity,
      receiverAddress: intent.user_address,
      chainId: intent.chain_id,
    });
    pxoTxHash = result.transactionHash;
  } catch (err) {
    log.error(
      { err, intentId: intent.id, fid: fundingId },
      'deposit-matching-worker: PXO transfer failed',
    );
    await markIntentFailed(intent, `PXO transfer failed: ${errorMessage(err)}`, log);
    return;
  }

  // Ledger entry + intent + trading_order all get marked complete.
  const { data: outputTx, error: txError } = await supabase
    .from('transactions')
    .insert({
      destination_type: 'user',
      destination_uuid: intent.user_id,
      from_type: 'wallet',
      from_uuid: intent.user_address,
      tx_hash: pxoTxHash,
      external_ref: fundingId,
      amount: intent.pxo_amount,
      state: 'PAGO_FINALIZADO',
    })
    .select()
    .single();
  if (txError) {
    log.warn(
      { err: txError, intentId: intent.id },
      'deposit-matching-worker: create output tx failed (non-fatal)',
    );
  }

  await supabase
    .from('deposit_intents')
    .update({ status: 'COMPLETED', pxo_tx_hash: pxoTxHash })
    .eq('id', intent.id);

  if (intent.trading_order_id) {
    await supabase
      .from('trading_orders')
      .update({
        status: 'COMPLETED',
        output_transaction_id: outputTx?.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', intent.trading_order_id);
  }

  log.info(
    { intentId: intent.id, fid: fundingId, pxoTxHash },
    'deposit-matching-worker: intent fulfilled',
  );
}

async function markIntentFailed(
  intent: DepositIntentRow,
  reason: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const supabase = getServerSupabase();
  await supabase
    .from('deposit_intents')
    .update({ status: 'FAILED', failure_reason: reason })
    .eq('id', intent.id);
  if (intent.trading_order_id) {
    await supabase
      .from('trading_orders')
      .update({ status: 'FAILED' })
      .eq('id', intent.trading_order_id);
  }
  log.warn({ intentId: intent.id, reason }, 'deposit-matching-worker: intent marked FAILED');
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

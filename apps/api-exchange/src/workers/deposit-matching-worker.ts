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
 *   3) For each unplaced funding, require ALL of:
 *        - the sender's CLABE is registered to a user;
 *        - that user has a PENDING intent whose source_clabe matches;
 *        - the intent was created BEFORE the money arrived;
 *        - the funding amount equals the intent amount exactly.
 *      Oldest qualifying intent wins (FIFO). If matched: claim atomically,
 *      issue PXO on-chain, mark COMPLETED.
 *   4) Anything that fails one of those is written to `unmatched_fundings`
 *      with the reason, once per funding id, for a human to reconcile.
 *
 * The amount and chronology conditions are load-bearing, not defensive. Until
 * 2026-09-04 the match was on CLABE alone, so any unconsumed funding from a
 * matching sender satisfied any intent of any size from any date — a 0.01 MXN
 * deposit would settle a 500,000 MXN intent. See SL-016.
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

    // Skip if this funding has already been tied to an intent.
    const { data: alreadyMatched } = await supabase
      .from('deposit_intents')
      .select('id')
      .eq('bitso_funding_id', funding.fid)
      .maybeSingle();
    if (alreadyMatched) continue;

    const senderClabe = extractSenderClabe(funding);
    if (!senderClabe) {
      await recordUnmatched(funding, 'clabe_missing', log);
      continue;
    }

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
      await recordUnmatched(funding, 'clabe_not_registered', log, { senderClabe });
      continue;
    }

    // FIFO: oldest PENDING intent for this user's CLABE that was created
    // BEFORE the money arrived. A deposit cannot pay for an intent that did
    // not exist yet, and without this a months-old funding could settle an
    // intent opened today — which is how SL-016 could have issued PXO for
    // nothing. It also means the historical fundings sitting in the scan
    // window can never match anything, by construction.
    const { data: intent, error: intentErr } = await supabase
      .from('deposit_intents')
      .select('id, user_id, mxn_amount, pxo_amount, source_clabe, chain_id, user_address, trading_order_id')
      .eq('user_id', userRow.id)
      .eq('source_clabe', senderClabe)
      .eq('status', 'PENDING')
      .lte('created_at', funding.created_at)
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
      // Distinguish "nothing pending at all" from "only intents newer than
      // the money", because they mean different things to whoever reconciles.
      const { count } = await supabase
        .from('deposit_intents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userRow.id)
        .eq('source_clabe', senderClabe)
        .eq('status', 'PENDING');
      await recordUnmatched(
        funding,
        (count ?? 0) > 0 ? 'funding_predates_intent' : 'no_pending_intent',
        log,
        { senderClabe },
      );
      continue;
    }

    // Exact amount. SPEI transfers are made for the amount the app quoted, so
    // anything else is an anomaly a human should look at rather than something
    // to auto-fulfil. Compared in cents to keep floating point out of it.
    if (toCents(funding.amount) !== toCents(intent.mxn_amount)) {
      await recordUnmatched(funding, 'amount_mismatch', log, {
        senderClabe,
        intentId: intent.id,
        expectedAmount: intent.mxn_amount,
      });
      continue;
    }

    await fulfillIntent(intent as DepositIntentRow, funding.fid, log);
  }
}

/** Money amounts as integer cents, so equality is exact. */
function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

type UnmatchedReason =
  | 'clabe_missing'
  | 'clabe_not_registered'
  | 'no_pending_intent'
  | 'amount_mismatch'
  | 'funding_predates_intent';

/**
 * Record a funding we could not place, one row per funding id.
 *
 * Upserted rather than inserted: the worker rescans the same window every
 * tick, and previously that meant re-logging the same deposits every 30
 * seconds with no durable record. `first_seen_at` is preserved by the
 * conflict clause; `last_seen_at` shows the funding is still in the window.
 */
async function recordUnmatched(
  funding: { fid: string; amount: string; currency: string; created_at: string },
  reason: UnmatchedReason,
  log: FastifyBaseLogger,
  extra?: { senderClabe?: string; intentId?: string; expectedAmount?: number },
): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase.from('unmatched_fundings').upsert(
    {
      bitso_funding_id: funding.fid,
      amount: Number(funding.amount),
      currency: funding.currency.toUpperCase(),
      sender_clabe: extra?.senderClabe ?? null,
      funding_created_at: funding.created_at,
      reason,
      intent_id: extra?.intentId ?? null,
      expected_amount: extra?.expectedAmount ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'bitso_funding_id' },
  );

  if (error) {
    log.warn({ err: error, fid: funding.fid, reason }, 'deposit-matching-worker: could not record unmatched funding');
    return;
  }

  log.debug(
    {
      fid: funding.fid,
      reason,
      senderClabe: extra?.senderClabe ? `****${extra.senderClabe.slice(-4)}` : undefined,
    },
    'deposit-matching-worker: funding recorded for reconciliation',
  );
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

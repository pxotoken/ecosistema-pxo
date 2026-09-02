import { createHmac } from 'node:crypto';
import { env } from '../config/env.js';

// Bitso Business API adapter (stage by default).
// Reference: https://docs.bitso.com/bitso-payments/docs
// Auth: header `Authorization: Bitso <key>:<nonce>:<signature>` where
//   signature = HMAC-SHA256(nonce + method + path + body, secret) hex.

interface BitsoRequestOptions {
  method: 'GET' | 'POST';
  path: string; // beginning with /, e.g. "/fundings/"
  body?: unknown;
  /**
   * Override the base URL for endpoints that don't live under
   * `BITSO_API_BASE_URL` — notably `/spei/test/deposits`, which sits at
   * the domain root rather than under `/api/v3`.
   */
  baseUrl?: string;
}

async function bitsoRequest<T>(opts: BitsoRequestOptions): Promise<T> {
  if (!env.BITSO_API_KEY || !env.BITSO_API_SECRET) {
    throw new Error('BITSO_API_KEY / BITSO_API_SECRET not configured');
  }

  // Bitso's HMAC signs the full URL path (from the domain root), NOT the
  // relative path passed to fetch. Deriving via URL keeps the signature
  // aligned regardless of whether BITSO_API_BASE_URL includes /api/v3.
  const base = opts.baseUrl ?? env.BITSO_API_BASE_URL;
  const url = new URL(`${base}${opts.path}`);
  const signedPath = url.pathname + url.search;

  const nonce = Date.now().toString();
  const bodyStr = opts.body ? JSON.stringify(opts.body) : '';
  const message = nonce + opts.method + signedPath + bodyStr;
  const signature = createHmac('sha256', env.BITSO_API_SECRET)
    .update(message, 'utf8')
    .digest('hex');

  const res = await fetch(url, {
    method: opts.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bitso ${env.BITSO_API_KEY}:${nonce}:${signature}`,
    },
    body: opts.body ? bodyStr : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bitso ${opts.method} ${signedPath} failed: ${res.status} ${text}`);
  }
  return JSON.parse(text) as T;
}

/**
 * Bitso withdrawal/funding status sets. Shared between the webhook handler
 * and the polling fallback in /sell-pxo-mxn/:id so both code paths agree
 * on what "done" looks like.
 */
export const BITSO_COMPLETE_STATUSES: ReadonlySet<string> = new Set([
  'complete',
  'completed',
  'COMPLETE',
]);
export const BITSO_FAILED_STATUSES: ReadonlySet<string> = new Set([
  'failed',
  'cancelled',
  'rejected',
  'FAILED',
  'CANCELLED',
]);

export interface BitsoFunding {
  fid: string;
  status: 'pending' | 'in_progress' | 'complete' | 'cancelled' | 'failed';
  created_at: string;
  currency: string;
  method: string;
  amount: string; // decimal string
  details?: Record<string, unknown>;
}

/**
 * Best-effort extraction of the sender CLABE from a Bitso funding's `details`
 * blob. Bitso doesn't publish a stable schema for the details field across
 * funding methods, so we probe the field names we've observed on SPEI (praxis)
 * fundings. Returns null if we can't find a CLABE-shaped value.
 */
export function extractSenderClabe(funding: BitsoFunding): string | null {
  const d = funding.details ?? {};
  const candidateKeys = [
    'sender_clabe',
    'origin_clabe',
    'sender_account',
    'source_clabe',
    'clabe',
  ] as const;
  for (const key of candidateKeys) {
    const value = (d as Record<string, unknown>)[key];
    if (typeof value === 'string' && /^\d{18}$/.test(value)) {
      return value;
    }
  }
  return null;
}

export interface BitsoWithdrawal {
  wid: string;
  status: string;
  created_at?: string;
  currency?: string;
  method?: string;
  amount?: string;
  details?: Record<string, unknown>;
}

/**
 * List recent fundings (pay-ins to our Bitso Business account).
 * Used to confirm a Conekta deposit landed before issuing PXO.
 * Demo path skips this when FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK=true.
 */
export async function bitsoGetFundings(
  opts: { limit?: number; method?: string } = {},
): Promise<BitsoFunding[]> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.method) params.set('method', opts.method);
  const query = params.toString();
  const path = `/fundings/${query ? `?${query}` : ''}`;

  const data = await bitsoRequest<{ success: boolean; payload: BitsoFunding[] }>({
    method: 'GET',
    path,
  });
  return data.payload ?? [];
}

export interface CreateBitsoSpeiWithdrawalParams {
  amountMxn: number; // major units, e.g. 100.00
  clabe: string;
  beneficiaryName: string;
  /** Idempotency key — Bitso will reject duplicates with same origin_id. */
  originId: string;
  numericReference?: string; // optional 7-digit numeric SPEI reference
  concept?: string; // free-form (up to 40 chars) shown in receiver bank
}

export interface BitsoWithdrawalResult {
  wid: string; // Bitso withdrawal id
  status: string;
}

/**
 * Request an SPEI pay-out from our Bitso Business account.
 * Returns immediately with a wid; final settlement arrives via webhook.
 */
export async function bitsoCreateSpeiWithdrawal(
  params: CreateBitsoSpeiWithdrawalParams,
): Promise<BitsoWithdrawalResult> {
  const body = {
    amount: params.amountMxn.toFixed(2),
    currency: 'mxn',
    method: 'praxis', // SPEI rail in Bitso Business
    origin_id: params.originId,
    beneficiary: params.beneficiaryName,
    clabe: params.clabe,
    ...(params.numericReference ? { numeric_reference: params.numericReference } : {}),
    ...(params.concept ? { concept: params.concept } : {}),
  };

  const data = await bitsoRequest<{
    success: boolean;
    payload: { wid: string; status: string };
  }>({
    method: 'POST',
    path: '/withdrawals/',
    body,
  });

  if (!data.payload?.wid) {
    throw new Error('Bitso withdrawal response missing wid');
  }
  return { wid: data.payload.wid, status: data.payload.status };
}

/**
 * Look up a single withdrawal by its wid. Used by the polling fallback
 * when Bitso webhooks aren't configured (stage demo path).
 * The endpoint returns either an object or a single-element array
 * depending on Bitso's response shape; we normalize to `BitsoWithdrawal`.
 */
export async function bitsoGetWithdrawalStatus(wid: string): Promise<BitsoWithdrawal | null> {
  const data = await bitsoRequest<{
    success: boolean;
    payload: BitsoWithdrawal | BitsoWithdrawal[];
  }>({
    method: 'GET',
    path: `/withdrawals/${encodeURIComponent(wid)}/`,
  });
  const payload = data.payload;
  if (Array.isArray(payload)) return payload[0] ?? null;
  return payload ?? null;
}

/**
 * Simulate an SPEI MXN deposit into our Bitso Business CLABE. STAGE ONLY.
 * Uses Bitso's `/spei/test/deposits` endpoint (docs:
 * https://docs.bitso.com/bitso-payouts-funding/docs/mock-deposits-in-mxn).
 *
 * The endpoint lives at the DOMAIN ROOT — not under `/api/v3` — hence
 * `baseUrl` override on the request. Callers should NEVER expose this in
 * production; the route that wraps this is env-flag gated.
 */
export interface CreateMockDepositParams {
  amountMxn: number;
  receiverClabe: string; // our Bitso Business CLABE
  receiverName: string;
}

export interface BitsoMockDepositResult {
  amount: string;
  tracking_code: string;
  receiver_clabe: string;
  receiver_name: string;
  created_at: string;
}

export async function bitsoCreateMockSpeiDeposit(
  params: CreateMockDepositParams,
): Promise<BitsoMockDepositResult> {
  // Derive the domain-root base from BITSO_API_BASE_URL by stripping any
  // trailing `/api/vN` segment. Works whether the env is set to
  // https://stage.bitso.com/api/v3 or https://stage.bitso.com.
  const rootBase = env.BITSO_API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

  const data = await bitsoRequest<{
    success: boolean;
    payload: BitsoMockDepositResult;
  }>({
    method: 'POST',
    baseUrl: rootBase,
    path: '/spei/test/deposits',
    body: {
      amount: params.amountMxn.toFixed(2),
      receiver_clabe: params.receiverClabe,
      receiver_name: params.receiverName,
    },
  });

  if (!data.payload?.tracking_code) {
    throw new Error('Bitso mock deposit response missing tracking_code');
  }
  return data.payload;
}

// Webhook signature verification moved to ./bitso-webhook-signature.ts.
// Bitso v4 signs asymmetrically (RSA); the old HMAC-over-a-shared-secret
// implementation here matched no scheme Bitso actually uses.

export interface BitsoWithdrawalEvent {
  eventType: string;
  wid: string;
  status: string;
  amountMxn: number | null;
}

/**
 * Parse the relevant fields from a Bitso withdrawal-status webhook.
 * Returns null for unrecognized payloads so handlers can ignore them.
 */
export function parseBitsoWithdrawalEvent(payload: unknown): BitsoWithdrawalEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as {
    event?: string;
    type?: string;
    payload?: { wid?: string; status?: string; amount?: string };
    data?: { wid?: string; status?: string; amount?: string };
  };
  const eventType = p.event ?? p.type ?? '';
  const obj = p.payload ?? p.data;
  if (!obj?.wid || !obj?.status) return null;

  return {
    eventType,
    wid: obj.wid,
    status: obj.status,
    amountMxn: obj.amount ? Number(obj.amount) : null,
  };
}

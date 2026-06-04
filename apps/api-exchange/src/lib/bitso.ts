import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

// Bitso Business API adapter (stage by default).
// Reference: https://docs.bitso.com/bitso-payments/docs
// Auth: header `Authorization: Bitso <key>:<nonce>:<signature>` where
//   signature = HMAC-SHA256(nonce + method + path + body, secret) hex.

interface BitsoRequestOptions {
  method: 'GET' | 'POST';
  path: string; // beginning with /, e.g. "/fundings/"
  body?: unknown;
}

async function bitsoRequest<T>(opts: BitsoRequestOptions): Promise<T> {
  if (!env.BITSO_API_KEY || !env.BITSO_API_SECRET) {
    throw new Error('BITSO_API_KEY / BITSO_API_SECRET not configured');
  }

  const nonce = Date.now().toString();
  const bodyStr = opts.body ? JSON.stringify(opts.body) : '';
  const message = nonce + opts.method + opts.path + bodyStr;
  const signature = createHmac('sha256', env.BITSO_API_SECRET)
    .update(message, 'utf8')
    .digest('hex');

  const res = await fetch(`${env.BITSO_API_BASE_URL}${opts.path}`, {
    method: opts.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bitso ${env.BITSO_API_KEY}:${nonce}:${signature}`,
    },
    body: opts.body ? bodyStr : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bitso ${opts.method} ${opts.path} failed: ${res.status} ${text}`);
  }
  return JSON.parse(text) as T;
}

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
 * Verify Bitso webhook signature. Bitso sends an `x-signature` header
 * containing HMAC-SHA256 of the raw body using the webhook secret.
 */
export function verifyBitsoWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!env.BITSO_WEBHOOK_SECRET || !signatureHeader) return false;
  const computed = createHmac('sha256', env.BITSO_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

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

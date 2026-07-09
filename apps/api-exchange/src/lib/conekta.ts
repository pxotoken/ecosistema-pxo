import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

// Conekta v2 Orders + Checkout adapter (sandbox-first).
// Reference: https://developers.conekta.com/reference/orders
// Verify field names and webhook signature scheme against the current docs
// before going live.

export interface CreateConektaOrderParams {
  /** MXN amount in major units (e.g. 100.00 for $100 MXN). */
  amountMxn: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  /** Our internal correlation id — round-tripped via metadata for webhook lookup. */
  internalRef: string;
  description?: string;
}

export interface ConektaOrderResult {
  orderId: string;
  checkoutUrl: string;
  expiresAt: number | null;
}

/**
 * Create a Conekta order with an embedded checkout. Returns a hosted URL the
 * user is redirected to. On payment success Conekta calls our webhook with
 * `order.paid` and the metadata.internal_ref we set here.
 */
export async function createConektaOrder(
  params: CreateConektaOrderParams,
): Promise<ConektaOrderResult> {
  if (!env.CONEKTA_PRIVATE_KEY) {
    throw new Error('CONEKTA_PRIVATE_KEY not configured');
  }

  const amountCents = Math.round(params.amountMxn * 100);

  const body = {
    currency: 'MXN',
    customer_info: {
      name: params.customerName,
      email: params.customerEmail,
      ...(params.customerPhone ? { phone: params.customerPhone } : {}),
    },
    line_items: [
      {
        name: params.description ?? 'PXO purchase',
        unit_price: amountCents,
        quantity: 1,
      },
    ],
    metadata: {
      internal_ref: params.internalRef,
    },
    checkout: {
      type: 'HostedPayment',
      allowed_payment_methods: ['cash', 'card', 'bank_transfer'],
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
      success_url: env.CONEKTA_SUCCESS_URL,
      failure_url: env.CONEKTA_FAILURE_URL,
    },
  };

  const res = await fetch(`${env.CONEKTA_API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.conekta-v2.0.0+json',
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' + Buffer.from(`${env.CONEKTA_PRIVATE_KEY}:`).toString('base64'),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Conekta order create failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    checkout?: { url?: string; expires_at?: number };
  };

  const checkoutUrl = data.checkout?.url;
  if (!data.id || !checkoutUrl) {
    throw new Error('Conekta order create returned no checkout URL');
  }

  return {
    orderId: data.id,
    checkoutUrl,
    expiresAt: data.checkout?.expires_at ?? null,
  };
}

/**
 * Verify a Conekta webhook by comparing the digest header with HMAC-SHA256
 * of the raw body using the configured webhook secret. Always call this on
 * the **raw** body, never the JSON-reparsed string.
 */
export function verifyConektaWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!env.CONEKTA_WEBHOOK_SECRET || !signatureHeader) return false;
  const computed = createHmac('sha256', env.CONEKTA_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export interface ConektaPaidEvent {
  eventType: string;
  orderId: string;
  amountMxn: number;
  internalRef: string | null;
  customerEmail: string | null;
}

/**
 * Parse the relevant fields from a Conekta `order.paid` event. Returns null
 * if the payload is not a paid-order event, so handlers can ignore other
 * event types without throwing.
 */
export function parseConektaPaidEvent(payload: unknown): ConektaPaidEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as {
    type?: string;
    data?: { object?: { id?: string; amount?: number; metadata?: Record<string, string>; customer_info?: { email?: string } } };
  };
  if (p.type !== 'order.paid') return null;

  const obj = p.data?.object;
  if (!obj?.id || typeof obj.amount !== 'number') return null;

  return {
    eventType: p.type,
    orderId: obj.id,
    amountMxn: obj.amount / 100,
    internalRef: obj.metadata?.internal_ref ?? null,
    customerEmail: obj.customer_info?.email ?? null,
  };
}

import { createVerify } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Bitso v4 webhook signature verification.
 *
 * v4 signs events asymmetrically — there is NO shared secret. This is why
 * registering a stage webhook in July returned no signing key: there is
 * none to return. Each delivery carries two headers:
 *
 *   x-bitso-webhook-event-signature   base64 RSA signature over the raw body
 *   x-bitso-key-id                    which public key to verify against
 *
 * Keys come from GET {BITSO_WEBHOOK_API_BASE_URL}/webhooks/public-key, which
 * returns an array so Bitso can rotate without breaking in-flight deliveries.
 *
 * Ref: docs/bitso/Webhooks Susbcription Updates - Documentation.pdf, §2.7.
 */

export const BITSO_SIGNATURE_HEADER = 'x-bitso-webhook-event-signature';
export const BITSO_KEY_ID_HEADER = 'x-bitso-key-id';

interface BitsoPublicKeyEntry {
  publicKey?: string;
  keyId?: string;
  created_at?: string;
}

/** keyId -> PEM-encoded public key. */
const keyCache = new Map<string, string>();

/**
 * An unknown keyId triggers a refetch, so an attacker could otherwise force
 * one outbound request per inbound webhook. Rate-limit refetches and dedupe
 * concurrent ones.
 */
const MIN_REFETCH_INTERVAL_MS = 60_000;
let lastFetchAt = 0;
let inFlight: Promise<void> | null = null;

/** Bitso may return bare base64 DER or a full PEM block. Normalise to PEM. */
function toPem(key: string): string {
  const trimmed = key.trim();
  if (trimmed.includes('BEGIN PUBLIC KEY')) return trimmed;
  const body = trimmed.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? trimmed;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
}

async function refreshKeys(): Promise<void> {
  const url = `${env.BITSO_WEBHOOK_API_BASE_URL}/webhooks/public-key`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Bitso public-key fetch failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as BitsoPublicKeyEntry[] | { payload?: BitsoPublicKeyEntry[] };
  const entries = Array.isArray(body) ? body : (body.payload ?? []);
  for (const entry of entries) {
    if (entry.keyId && entry.publicKey) {
      keyCache.set(entry.keyId, toPem(entry.publicKey));
    }
  }
}

async function getPublicKey(keyId: string): Promise<string | undefined> {
  const cached = keyCache.get(keyId);
  if (cached) return cached;

  if (Date.now() - lastFetchAt < MIN_REFETCH_INTERVAL_MS) return undefined;

  if (!inFlight) {
    lastFetchAt = Date.now();
    inFlight = refreshKeys().finally(() => {
      inFlight = null;
    });
  }
  await inFlight;
  return keyCache.get(keyId);
}

/**
 * Verify a v4 webhook delivery. `rawBody` must be the exact bytes Bitso
 * sent — a re-serialised `JSON.stringify(req.body)` will not match.
 */
export async function verifyBitsoWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  keyId: string | undefined,
): Promise<boolean> {
  if (!rawBody || !signature || !keyId) return false;

  let pem: string | undefined;
  try {
    pem = await getPublicKey(keyId);
  } catch {
    return false;
  }
  if (!pem) return false;

  try {
    return createVerify('RSA-SHA256').update(rawBody, 'utf8').verify(pem, signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * Bitso publishes fixed egress IPs and asks clients to whitelist them
 * (§3). Empty allowlist disables the check, which is what stage and local
 * development want.
 */
export function isAllowedBitsoIp(ip: string | undefined): boolean {
  const allow = env.BITSO_WEBHOOK_IP_ALLOWLIST.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allow.length === 0) return true;
  if (!ip) return false;
  // Normalise IPv4-mapped IPv6 (::ffff:52.15.91.227) to plain IPv4.
  const normalised = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return allow.includes(normalised);
}

/** Exposed for tests / ops tooling. */
export function __clearBitsoKeyCache(): void {
  keyCache.clear();
  lastFetchAt = 0;
}

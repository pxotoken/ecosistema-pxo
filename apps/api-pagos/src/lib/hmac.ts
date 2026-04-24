import crypto from 'node:crypto';

/**
 * Produce an HMAC-SHA256 hex signature for the given payload.
 */
export function signHMAC(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature in constant time. Accepts bare hex digests
 * as well as `sha256=<hex>` form commonly used by GitHub/QuickNode webhooks.
 */
export function verifyHMAC(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const provided = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature;
  const expected = signHMAC(payload, secret);
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

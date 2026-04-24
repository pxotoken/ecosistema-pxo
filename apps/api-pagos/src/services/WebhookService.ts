import { env } from '../config/env.js';
import { signHMAC, verifyHMAC } from '../lib/hmac.js';
import type { POSConfirmationWebhook } from '../types/webhook.js';

export interface NotifyPosResult {
  ok: boolean;
  status: number;
  bodyPreview: string;
}

export class WebhookService {
  /**
   * Deliver a confirmation to the merchant's callback URL. Signs the body with
   * HMAC-SHA256 and sends it in the `X-PXO-Signature` header.
   *
   * `callbackSecret` is an optional per-merchant override (kept on the
   * merchants table in prod). Falls back to WEBHOOK_OUTBOUND_SECRET from env.
   */
  async notifyPos(
    callbackUrl: string,
    payload: POSConfirmationWebhook,
    callbackSecret?: string,
  ): Promise<NotifyPosResult> {
    const body = JSON.stringify(payload);
    const secret = callbackSecret || env.WEBHOOK_OUTBOUND_SECRET;
    const signature = secret ? signHMAC(body, secret) : '';

    try {
      const res = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(signature ? { 'X-PXO-Signature': signature } : {}),
        },
        body,
      });
      const preview = await res.text().catch(() => '');
      return { ok: res.ok, status: res.status, bodyPreview: preview.slice(0, 200) };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        bodyPreview: err instanceof Error ? err.message : 'unknown fetch error',
      };
    }
  }

  /**
   * Verify the HMAC signature of an inbound webhook (QuickNode / Alchemy).
   * Uses WEBHOOK_INBOUND_SECRET from env.
   */
  verifyInboundSignature(signature: string, rawBody: string): boolean {
    if (!env.WEBHOOK_INBOUND_SECRET) {
      // Fail closed if the secret is not configured (prevents accidental open
      // webhook endpoint in prod).
      return false;
    }
    return verifyHMAC(rawBody, signature, env.WEBHOOK_INBOUND_SECRET);
  }
}

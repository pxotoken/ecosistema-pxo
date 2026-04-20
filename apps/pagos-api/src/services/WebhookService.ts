import type { POSConfirmationWebhook } from '../types/webhook.js';

export class WebhookService {
  async notifyPOS(_callbackUrl: string, _payload: POSConfirmationWebhook): Promise<boolean> {
    // TODO: Send POST to merchant callback URL with HMAC-SHA256 signature
    // Header: X-PXO-Signature
    throw new Error('Not implemented');
  }

  verifyQuickNodeSignature(_signature: string, _rawBody: string): boolean {
    // TODO: Verify X-QN-Signature HMAC-SHA256
    throw new Error('Not implemented');
  }
}

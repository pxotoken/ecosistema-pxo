import type { FastifyInstance } from 'fastify';

export async function polygonTransferWebhookRoute(app: FastifyInstance) {
  app.post('/polygon/transfer', async (_req, _reply) => {
    // TODO: Implement POST /v1/webhooks/polygon/transfer
    // 1. Verify HMAC-SHA256 signature (X-Alchemy-Signature or X-QN-Signature)
    // 2. Parse PolygonTransferWebhook body
    // 3. Verify txHash on Polygon Amoy via Alchemy/viem (receipt)
    // 4. Match to === merchantWallet and value === amountPXO
    // 5. Update Payment → CONFIRMED
    // 6. Send webhook to POS (POST merchantCallbackUrl/pos/confirm)
    // 7. Record in merchant transaction history
    throw new Error('Not implemented');
  });
}

import type { FastifyInstance } from 'fastify';

export async function generatePaymentRoute(app: FastifyInstance) {
  app.post('/generate', async (_req, _reply) => {
    // TODO: Implement POST /v1/payments/generate
    // 1. Validate request body (generatePaymentSchema)
    // 2. Validate merchantId + posId in DB
    // 3. Verify merchant wallet is active on Polygon Amoy
    // 4. Calculate amountPXO (paridad 1:1 MXN)
    // 5. Generate paymentId (UUID v4)
    // 6. Build EIP-681 QR payload
    // 7. Generate QR image (base64 PNG 400x400)
    // 8. Persist Payment in PENDING state with TTL 5 min
    // 9. Return GeneratePaymentResponse
    throw new Error('Not implemented');
  });
}

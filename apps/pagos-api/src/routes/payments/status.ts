import type { FastifyInstance } from 'fastify';

export async function paymentStatusRoute(app: FastifyInstance) {
  app.get('/:paymentId/status', async (_req, _reply) => {
    // TODO: Implement GET /v1/payments/:paymentId/status
    // 1. Lookup payment by paymentId
    // 2. Check TTL expiration → mark EXPIRED if applicable
    // 3. Return PaymentStatusResponse
    throw new Error('Not implemented');
  });
}

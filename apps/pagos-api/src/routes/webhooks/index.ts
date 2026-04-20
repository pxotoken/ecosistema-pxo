import type { FastifyInstance } from 'fastify';
import { polygonTransferWebhookRoute } from './polygon-transfer.js';

export async function webhookRoutes(app: FastifyInstance) {
  await app.register(polygonTransferWebhookRoute);
}

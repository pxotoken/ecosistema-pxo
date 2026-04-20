import type { FastifyInstance } from 'fastify';
import { generatePaymentRoute } from './generate.js';
import { paymentStatusRoute } from './status.js';

export async function paymentRoutes(app: FastifyInstance) {
  await app.register(generatePaymentRoute);
  await app.register(paymentStatusRoute);
}

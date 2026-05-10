import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AppServices } from '../../services/index.js';
import { generatePaymentRoute } from './generate.js';
import { paymentStatusRoute } from './status.js';
import { reportTxRoute } from './reportTx.js';

export function paymentRoutes(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    await app.register(generatePaymentRoute(services));
    await app.register(paymentStatusRoute(services));
    await app.register(reportTxRoute(services));
  };
}

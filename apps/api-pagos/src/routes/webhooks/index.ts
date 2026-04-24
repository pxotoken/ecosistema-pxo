import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AppServices } from '../../services/index.js';
import { transferWebhookRoute } from './transfer.js';

export function webhookRoutes(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    await app.register(transferWebhookRoute(services));
  };
}

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AppServices } from '../../services/index.js';
import { createChargeIntentRoute } from './createIntent.js';
import { pendingChargeRoute } from './pending.js';

export function chargeRoutes(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    await app.register(createChargeIntentRoute(services));
    await app.register(pendingChargeRoute(services));
  };
}

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createChargeIntentSchema } from '../../schemas/payment.js';
import type { AppServices } from '../../services/index.js';
import { authenticateApiKey } from '../../middleware/auth.js';
import { LivePullIntentExistsError } from '../../services/PaymentService.js';
import type { CreateChargeIntentRequest } from '../../types/payment.js';

export function createChargeIntentRoute(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: CreateChargeIntentRequest }>(
      '/intent',
      { preHandler: authenticateApiKey(services.merchants) },
      async (req, reply) => {
        const { error, value } = createChargeIntentSchema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          return reply.code(400).send({
            error: 'Validation failed',
            code: 'INVALID_BODY',
            details: error.details.map((d) => d.message),
          });
        }

        const auth = req.merchantAuth!;
        try {
          const response = await services.payments.createIntent(
            value as CreateChargeIntentRequest,
            { merchant: auth.merchant, pos: auth.pos },
          );
          return reply.send(response);
        } catch (err) {
          if (err instanceof LivePullIntentExistsError) {
            return reply.code(409).send({
              error: 'A live charge already exists for this client wallet',
              code: 'LIVE_INTENT_EXISTS',
            });
          }
          req.log.error({ err }, 'charges/intent failed');
          return reply.code(500).send({
            error: 'Failed to create charge intent',
            details: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      },
    );
  };
}

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { generatePaymentSchema } from '../../schemas/payment.js';
import type { AppServices } from '../../services/index.js';
import { authenticateApiKey } from '../../middleware/auth.js';
import type { GeneratePaymentRequest } from '../../types/payment.js';

export function generatePaymentRoute(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: GeneratePaymentRequest }>(
      '/generate',
      { preHandler: authenticateApiKey(services.merchants) },
      async (req, reply) => {
        const { error, value } = generatePaymentSchema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          return reply.code(400).send({
            error: 'Validation failed',
            code: 'INVALID_AMOUNT',
            details: error.details.map((d) => d.message),
          });
        }

        const auth = req.merchantAuth!;
        try {
          const response = await services.payments.generate(value as GeneratePaymentRequest, {
            merchant: auth.merchant,
            pos: auth.pos,
          });
          return reply.send(response);
        } catch (err) {
          req.log.error({ err }, 'payments/generate failed');
          return reply.code(500).send({
            error: 'Failed to generate payment',
            details: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      },
    );
  };
}

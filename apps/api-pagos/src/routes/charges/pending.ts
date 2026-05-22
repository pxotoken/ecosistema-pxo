import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { pendingChargeQuerySchema } from '../../schemas/payment.js';
import type { AppServices } from '../../services/index.js';

interface Query {
  wallet: string;
}

// Polling público que la app del cliente usa mientras la pantalla "Pagar"
// está abierta. Solo devuelve PULL en estado PENDING + sin tx_hash + no
// expirado. No requiere auth: la wallet del cliente ya es pública on-chain
// y el alcance del dato es mínimo (monto + nombre del comercio).
export function pendingChargeRoute(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.get<{ Querystring: Query }>('/pending', async (req, reply) => {
      const { error, value } = pendingChargeQuerySchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        return reply.code(400).send({
          error: 'Validation failed',
          code: 'INVALID_QUERY',
          details: error.details.map((d) => d.message),
        });
      }

      try {
        const pending = await services.payments.getPendingForClient((value as Query).wallet);
        return reply.send({ pending });
      } catch (err) {
        req.log.error({ err }, 'charges/pending failed');
        return reply.code(500).send({
          error: 'Failed to fetch pending charge',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });
  };
}

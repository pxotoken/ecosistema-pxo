import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AppServices } from '../../services/index.js';

interface Params {
  paymentId: string;
}

export function paymentStatusRoute(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.get<{ Params: Params }>('/:paymentId/status', async (req, reply) => {
      const { paymentId } = req.params;
      try {
        const status = await services.payments.getStatus(paymentId);
        if (!status) return reply.code(404).send({ error: 'Payment not found' });
        return reply.send(status);
      } catch (err) {
        req.log.error({ err }, 'payments/status failed');
        return reply.code(500).send({
          error: 'Failed to fetch payment status',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });
  };
}

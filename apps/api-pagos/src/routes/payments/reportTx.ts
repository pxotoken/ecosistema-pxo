import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import Joi from 'joi';
import type { AppServices } from '../../services/index.js';

interface Params {
  paymentId: string;
}

interface Body {
  txHash: string;
  clientWallet: string;
}

const bodySchema = Joi.object({
  txHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .required(),
  clientWallet: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),
});

export function reportTxRoute(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.patch<{ Params: Params; Body: Body }>('/:paymentId/tx', async (req, reply) => {
      const { error, value } = bodySchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.details.map((d) => d.message),
        });
      }

      const { paymentId } = req.params;
      const { txHash, clientWallet } = value as Body;

      try {
        const payment = await services.payments.getStatus(paymentId);
        if (!payment) {
          return reply.code(404).send({ error: 'Payment not found' });
        }
        if (payment.status !== 'PENDING') {
          return reply.code(409).send({
            error: 'Payment is not PENDING',
            status: payment.status,
          });
        }

        const result = await services.payments.recordClientTxHash(
          paymentId,
          txHash,
          clientWallet,
        );

        if (result.recorded) {
          services.reconciliation.reconcilePendingPayments().catch((err) => {
            req.log.warn({ err }, 'eager reconciliation after reportTx failed');
          });
        }

        return reply.send({
          recorded: result.recorded,
          alreadyHasTx: result.alreadyHasTx,
          paymentId,
          txHash,
        });
      } catch (err) {
        req.log.error({ err }, 'payments/reportTx failed');
        return reply.code(500).send({
          error: 'Failed to record transaction hash',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });
  };
}

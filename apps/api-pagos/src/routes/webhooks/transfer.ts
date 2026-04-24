import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { polygonTransferWebhookSchema } from '../../schemas/webhook.js';
import type { AppServices } from '../../services/index.js';

interface Body {
  txHash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  blockTimestamp: number;
  contractAddress: string;
}

/**
 * Registers the inbound transfer webhook. Accepts DF-compliant path
 * `/:chainSlug/transfer` (e.g. /bsc/transfer, /polygon-amoy/transfer). The
 * slug is informational only; the active chain is resolved from
 * PAYMENTS_CHAIN_ID. Signature is verified with WEBHOOK_INBOUND_SECRET.
 */
export function transferWebhookRoute(services: AppServices): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Params: { chainSlug: string }; Body: Body }>(
      '/:chainSlug/transfer',
      async (req, reply) => {
        const signature =
          (req.headers['x-qn-signature'] as string | undefined) ||
          (req.headers['x-alchemy-signature'] as string | undefined) ||
          '';

        // Dev caveat: we sign the re-serialised JSON. In prod this must be the
        // raw wire bytes — attach `fastify-raw-body` and read `req.rawBody`.
        const rawBody =
          (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});

        if (!services.webhooks.verifyInboundSignature(signature, rawBody)) {
          return reply.code(401).send({ error: 'Invalid webhook signature' });
        }

        const { error, value } = polygonTransferWebhookSchema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.details.map((d) => d.message),
          });
        }

        const body = value as Body;

        // Verify on-chain receipt before trusting the webhook payload.
        const onchain = await services.blockchain.verifyTransaction(body.txHash);
        if (!onchain) {
          req.log.warn(
            { txHash: body.txHash },
            'transfer webhook: receipt not confirmed yet or unrecognized log',
          );
          return reply.code(202).send({ status: 'pending', reason: 'receipt not found' });
        }

        const result = await services.payments.handleVerifiedTransfer(body.txHash, onchain);
        if (!result) {
          return reply.code(200).send({ status: 'ignored', reason: 'no matching payment' });
        }

        return reply.send({
          status: 'confirmed',
          paymentId: result.id,
          txHash: result.txHash,
        });
      },
    );
  };
}

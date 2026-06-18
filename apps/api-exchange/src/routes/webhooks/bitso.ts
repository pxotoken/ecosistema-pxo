import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../../lib/supabase.js';
import {
  parseBitsoWithdrawalEvent,
  verifyBitsoWebhookSignature,
  BITSO_COMPLETE_STATUSES,
  BITSO_FAILED_STATUSES,
} from '../../lib/bitso.js';

export const bitsoWebhookRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/webhooks/bitso', async (req, reply) => {
    const rawBody =
      (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature =
      (req.headers['x-signature'] as string | undefined) ??
      (req.headers['x-bitso-signature'] as string | undefined);

    if (!verifyBitsoWebhookSignature(rawBody, signature)) {
      req.log.warn('bitso webhook: signature verification failed');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const event = parseBitsoWithdrawalEvent(req.body);
    if (!event) {
      return reply.send({ received: true, ignored: true });
    }

    const supabase = getServerSupabase();

    const { data: intent, error: intentError } = await supabase
      .from('redemption_intents')
      .select('id, status, trading_order_id, mxn_amount')
      .eq('bitso_withdrawal_id', event.wid)
      .maybeSingle();
    if (intentError) {
      req.log.error({ err: intentError, wid: event.wid }, 'bitso webhook: lookup failed');
      return reply.code(500).send({ error: 'Lookup failed' });
    }
    if (!intent) {
      req.log.warn({ wid: event.wid }, 'bitso webhook: no matching intent');
      return reply.send({ received: true, no_match: true });
    }

    if (intent.status === 'COMPLETED' || intent.status === 'FAILED') {
      return reply.send({ received: true, terminal: true, status: intent.status });
    }

    if (BITSO_COMPLETE_STATUSES.has(event.status)) {
      const completedAt = new Date().toISOString();
      await supabase
        .from('redemption_intents')
        .update({ status: 'COMPLETED' })
        .eq('id', intent.id);
      if (intent.trading_order_id) {
        await supabase
          .from('trading_orders')
          .update({ status: 'COMPLETED', completed_at: completedAt })
          .eq('id', intent.trading_order_id);
      }
      return reply.send({ received: true, processed: true, status: 'COMPLETED' });
    }

    if (BITSO_FAILED_STATUSES.has(event.status)) {
      await supabase
        .from('redemption_intents')
        .update({
          status: 'FAILED',
          failure_reason: `Bitso withdrawal status: ${event.status}`,
        })
        .eq('id', intent.id);
      if (intent.trading_order_id) {
        await supabase
          .from('trading_orders')
          .update({ status: 'FAILED' })
          .eq('id', intent.trading_order_id);
      }
      // PXO is in treasury — ops needs to know to refund the user manually,
      // since automated PXO-return is out of scope for the demo.
      req.log.error(
        { intentId: intent.id, wid: event.wid, mxnAmount: intent.mxn_amount },
        'bitso webhook: SPEI failed — PXO sits in treasury, manual ops refund required',
      );
      return reply.send({ received: true, processed: true, status: 'FAILED' });
    }

    // In-progress state — ack without changing anything.
    return reply.send({ received: true, in_progress: true, bitsoStatus: event.status });
  });
};

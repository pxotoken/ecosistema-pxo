import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../../lib/supabase.js';
import {
  parseBitsoWithdrawalEvent,
  BITSO_COMPLETE_STATUSES,
  BITSO_FAILED_STATUSES,
} from '../../lib/bitso.js';
import {
  verifyBitsoWebhookSignature,
  isAllowedBitsoIp,
  BITSO_SIGNATURE_HEADER,
  BITSO_KEY_ID_HEADER,
} from '../../lib/bitso-webhook-signature.js';

export const bitsoWebhookRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Signature verification needs the exact bytes Bitso signed. Fastify's
  // default JSON parser discards them, and re-serialising the parsed object
  // will not round-trip (key order, whitespace, number formatting). Keep the
  // raw string on the request alongside the parsed body.
  //
  // Content-type parsers are encapsulated per plugin, so this applies only
  // to routes registered inside this plugin — which is what we want.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const raw = typeof body === 'string' ? body : body.toString('utf8');
        (_req as unknown as { rawBody?: string }).rawBody = raw;
        done(null, raw.length ? JSON.parse(raw) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post('/webhooks/bitso', async (req, reply) => {
    if (!isAllowedBitsoIp(req.ip)) {
      req.log.warn({ ip: req.ip }, 'bitso webhook: source IP not in allowlist');
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    const signature = req.headers[BITSO_SIGNATURE_HEADER] as string | undefined;
    const keyId = req.headers[BITSO_KEY_ID_HEADER] as string | undefined;

    if (!rawBody) {
      // Would mean the content-type parser above did not run for this
      // request — fail closed rather than verify against a reconstruction.
      req.log.error('bitso webhook: raw body unavailable, cannot verify signature');
      return reply.code(400).send({ error: 'Unsupported content type' });
    }

    if (!(await verifyBitsoWebhookSignature(rawBody, signature, keyId))) {
      req.log.warn({ keyId }, 'bitso webhook: signature verification failed');
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

    // Bitso delivers at-least-once and out of order (PDF section 2.6), so the
    // same event can arrive twice and a stale in-progress event can arrive
    // after a terminal one. Refusing to leave a terminal state is what makes
    // this handler idempotent.
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

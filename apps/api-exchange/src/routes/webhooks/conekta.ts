import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../../lib/supabase.js';
import { sendPXOToUser } from '../../lib/send-pxo.js';
import { PXO_TOKEN_ADDRESSES, type SupportedChainId } from '../../config/chains.js';
import { env } from '../../config/env.js';
import {
  parseConektaPaidEvent,
  verifyConektaWebhookSignature,
} from '../../lib/conekta.js';
import { bitsoGetFundings } from '../../lib/bitso.js';
import { getContract, readContract } from 'thirdweb';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerThirdwebClient } from '../../lib/thirdweb-client.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

export const conektaWebhookRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Capture raw body for signature verification. Fastify parses JSON by
  // default; we register a content parser that keeps both the parsed body
  // and the raw string available on the request.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const raw = typeof body === 'string' ? body : body.toString('utf8');
        const json = raw.length ? JSON.parse(raw) : {};
        // Attach raw body for downstream signature check.
        (_req as unknown as { rawBody?: string }).rawBody = raw;
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post('/webhooks/conekta', async (req, reply) => {
    const rawBody =
      (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature = req.headers['digest'] as string | undefined;

    if (!verifyConektaWebhookSignature(rawBody, signature)) {
      req.log.warn('conekta webhook: signature verification failed');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const event = parseConektaPaidEvent(req.body);
    if (!event) {
      // Not a paid event we care about — ack quietly.
      return reply.send({ received: true, ignored: true });
    }

    const supabase = getServerSupabase();

    // Idempotency check: look up the trading_order by external_ref.
    const { data: existingOrder, error: lookupError } = await supabase
      .from('trading_orders')
      .select('id, status, user_id, chain_id, base_amount, quote_amount, input_transaction_id')
      .eq('payment_method', 'conekta_bitso')
      .eq('external_ref', event.orderId)
      .maybeSingle();

    if (lookupError) {
      req.log.error({ err: lookupError, orderId: event.orderId }, 'conekta webhook: lookup failed');
      return reply.code(500).send({ error: 'Lookup failed' });
    }
    if (!existingOrder) {
      req.log.warn({ orderId: event.orderId }, 'conekta webhook: no matching trading_order');
      return reply.send({ received: true, no_match: true });
    }
    if (existingOrder.status === 'COMPLETED') {
      // Already processed. Idempotent ack.
      return reply.send({ received: true, already_completed: true });
    }

    // Atomic claim: only proceed if status is still OPEN. Concurrent webhook
    // deliveries lose the race and exit early.
    const { data: claimed, error: claimError } = await supabase
      .from('trading_orders')
      .update({ status: 'PROCESSING' })
      .eq('id', existingOrder.id)
      .eq('status', 'OPEN')
      .select()
      .maybeSingle();

    if (claimError) {
      req.log.error({ err: claimError }, 'conekta webhook: claim failed');
      return reply.code(500).send({ error: 'Claim failed' });
    }
    if (!claimed) {
      // Another delivery already claimed this order; safe to ack.
      return reply.send({ received: true, already_processing: true });
    }

    // Confirm funds actually arrived in Bitso (production guard). Demo flag
    // bypasses this and trusts Conekta directly so investors don't watch a
    // spinner waiting on stage Bitso polling.
    if (!env.FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK) {
      try {
        const fundings = await bitsoGetFundings({ limit: 25 });
        const match = fundings.find(
          (f) =>
            f.currency.toLowerCase() === 'mxn' &&
            f.status === 'complete' &&
            Number(f.amount) >= event.amountMxn - 0.01,
        );
        if (!match) {
          // Re-open and let a future webhook delivery retry. Bitso usually
          // lags Conekta by seconds-to-minutes.
          await supabase
            .from('trading_orders')
            .update({ status: 'OPEN' })
            .eq('id', existingOrder.id);
          return reply.send({ received: true, awaiting_bitso: true });
        }
      } catch (err) {
        req.log.error({ err }, 'conekta webhook: Bitso funding check failed');
        await supabase
          .from('trading_orders')
          .update({ status: 'OPEN' })
          .eq('id', existingOrder.id);
        return reply.code(502).send({ error: 'Bitso funding check failed' });
      }
    }

    // Look up the user wallet stashed on the input transaction.
    let receiverAddress: string | null = null;
    if (existingOrder.input_transaction_id) {
      const { data: inputTx } = await supabase
        .from('transactions')
        .select('destination_uuid')
        .eq('id', existingOrder.input_transaction_id)
        .maybeSingle();
      receiverAddress = inputTx?.destination_uuid ?? null;
    }
    if (!receiverAddress) {
      req.log.error({ orderId: event.orderId }, 'conekta webhook: receiver address not found');
      await supabase
        .from('trading_orders')
        .update({ status: 'FAILED' })
        .eq('id', existingOrder.id);
      return reply.code(500).send({ error: 'Receiver address not found' });
    }

    const chainId = existingOrder.chain_id as SupportedChainId;
    const selectedChain = CHAIN_MAP[chainId];
    const pxoContractAddress = PXO_TOKEN_ADDRESSES[chainId];
    if (!selectedChain || !pxoContractAddress) {
      req.log.error({ chainId }, 'conekta webhook: chain not configured');
      await supabase
        .from('trading_orders')
        .update({ status: 'FAILED' })
        .eq('id', existingOrder.id);
      return reply.code(500).send({ error: 'Chain not configured' });
    }

    // Read on-chain decimals so we mint in correct atomic units. Falls back
    // to 18 if the contract read fails — same convention as buy-pxo.ts.
    let decimals = 18;
    try {
      const client = getServerThirdwebClient();
      if (client) {
        const pxoContract = getContract({ address: pxoContractAddress, client, chain: selectedChain });
        const onChainDecimals = await readContract({
          contract: pxoContract,
          method: 'function decimals() view returns (uint8)',
          params: [],
        });
        decimals = Number(onChainDecimals);
      }
    } catch (err) {
      req.log.warn({ err }, 'conekta webhook: PXO decimals read failed, using 18');
    }

    const pxoAmount = Number(existingOrder.quote_amount);
    const pxoQuantity = BigInt(Math.floor(pxoAmount * 10 ** decimals));

    let pxoTxHash: string;
    try {
      const result = await sendPXOToUser({
        quantity: pxoQuantity,
        receiverAddress,
        chainId,
      });
      pxoTxHash = result.transactionHash;
    } catch (err) {
      req.log.error({ err, orderId: event.orderId }, 'conekta webhook: PXO transfer failed');
      await supabase
        .from('trading_orders')
        .update({ status: 'FAILED' })
        .eq('id', existingOrder.id);
      return reply.code(500).send({ error: 'PXO transfer failed' });
    }

    const { data: outputTx, error: outputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'user',
        destination_uuid: existingOrder.user_id,
        from_type: 'wallet',
        from_uuid: receiverAddress,
        tx_hash: pxoTxHash,
        external_ref: event.orderId,
        amount: pxoAmount,
        state: 'PAGO_FINALIZADO',
      })
      .select()
      .single();
    if (outputError) {
      req.log.warn({ err: outputError }, 'conekta webhook: create output tx failed (non-fatal)');
    }

    await supabase
      .from('trading_orders')
      .update({
        status: 'COMPLETED',
        output_transaction_id: outputTx?.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', existingOrder.id);

    return reply.send({
      received: true,
      processed: true,
      pxoTransactionHash: pxoTxHash,
    });
  });
};

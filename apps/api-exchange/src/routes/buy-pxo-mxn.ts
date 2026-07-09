import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import { createConektaOrder } from '../lib/conekta.js';

const SUPPORTED_CHAINS = [137, 80002] as const;

interface BuyPxoMxnBody {
  amountMxn?: number;
  userAddress?: string;
  chainId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Fiat on-ramp: user pays MXN via Conekta → funds land in our Bitso
 * Business account → on confirmation, PXO is transferred 1:1 from treasury
 * to the user's wallet.
 *
 * This endpoint creates the Conekta order and a placeholder trading_order;
 * actual PXO issuance happens in the /webhooks/conekta handler.
 */
export const buyPxoMxnRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: BuyPxoMxnBody }>(
    '/buy-pxo-mxn',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      if (user.kyc_status !== 'VALIDATED') {
        return reply.code(403).send({
          error: 'KYC validation required',
          message: 'Debes completar y validar tu KYC para poder comprar PXO con MXN',
        });
      }

      const { amountMxn, userAddress, chainId, customerName, customerEmail, customerPhone } =
        req.body ?? {};

      if (!amountMxn || amountMxn <= 0 || !userAddress || !chainId) {
        return reply.code(400).send({ error: 'Missing or invalid required fields' });
      }
      if (!SUPPORTED_CHAINS.includes(chainId as (typeof SUPPORTED_CHAINS)[number])) {
        return reply.code(400).send({ error: `Unsupported chain ID: ${chainId}` });
      }
      if (!customerName || !customerEmail) {
        return reply.code(400).send({ error: 'customerName and customerEmail are required' });
      }

      // PXO is pegged 1:1 to MXN — no Binance lookup needed.
      const pxoAmount = amountMxn;
      const internalRef = randomUUID();

      let conektaOrder;
      try {
        conektaOrder = await createConektaOrder({
          amountMxn,
          customerName,
          customerEmail,
          customerPhone,
          internalRef,
          description: `Compra de ${pxoAmount.toFixed(2)} PXO`,
        });
      } catch (err) {
        req.log.error({ err }, 'buy-pxo-mxn: Conekta order create failed');
        return reply.code(502).send({
          error: 'Failed to create Conekta order',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      const { data: order, error: orderError } = await supabase
        .from('trading_orders')
        .insert({
          user_id: user.id,
          order_type: 'BUY',
          currency_pair: 'PXO/MXN',
          base_amount: amountMxn,
          quote_amount: pxoAmount,
          price: 1,
          status: 'OPEN',
          chain_id: chainId,
          payment_method: 'conekta_bitso',
          external_ref: conektaOrder.orderId,
        })
        .select()
        .single();

      if (orderError) {
        req.log.error({ err: orderError }, 'buy-pxo-mxn: create trading_order failed');
        return reply.code(500).send({ error: 'Failed to create order' });
      }

      // Stash the user's wallet on the order so the webhook (which has no
      // caller identity) knows where to send the PXO. Reusing transactions
      // table's polymorphic destination_uuid for this.
      const { data: intentTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          destination_type: 'wallet',
          destination_uuid: userAddress,
          from_type: 'user',
          from_uuid: user.id,
          tx_hash: null,
          external_ref: conektaOrder.orderId,
          amount: amountMxn,
          state: 'PENDIENTE',
        })
        .select()
        .single();
      if (txError) {
        req.log.warn({ err: txError }, 'buy-pxo-mxn: create intent tx failed (non-fatal)');
      } else {
        await supabase
          .from('trading_orders')
          .update({ input_transaction_id: intentTx.id })
          .eq('id', order.id);
      }

      return reply.send({
        success: true,
        tradingOrderId: order.id,
        conektaOrderId: conektaOrder.orderId,
        checkoutUrl: conektaOrder.checkoutUrl,
        amountMxn,
        pxoAmount,
        message: 'Conekta checkout created. PXO will be issued on payment confirmation.',
      });
    },
  );

  /**
   * Polling endpoint for the frontend to check order status while the
   * user is on the Conekta checkout / waiting for confirmation.
   */
  app.get<{ Params: { id: string } }>(
    '/buy-pxo-mxn/:id',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      const { data: order, error } = await supabase
        .from('trading_orders')
        .select('id, status, base_amount, quote_amount, external_ref, output_transaction_id, completed_at')
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        req.log.error({ err: error }, 'buy-pxo-mxn status: select failed');
        return reply.code(500).send({ error: 'Failed to read order' });
      }
      if (!order) return reply.code(404).send({ error: 'Order not found' });

      let pxoTxHash: string | null = null;
      if (order.output_transaction_id) {
        const { data: outTx } = await supabase
          .from('transactions')
          .select('tx_hash')
          .eq('id', order.output_transaction_id)
          .maybeSingle();
        pxoTxHash = outTx?.tx_hash ?? null;
      }

      return reply.send({
        id: order.id,
        status: order.status,
        amountMxn: order.base_amount,
        pxoAmount: order.quote_amount,
        conektaOrderId: order.external_ref,
        pxoTransactionHash: pxoTxHash,
        completedAt: order.completed_at,
      });
    },
  );
};

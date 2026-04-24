import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';
import { requireCaller } from '../middleware/identity.js';

interface OrdersQuery {
  userAddress?: string;
  chainId?: string;
}

interface TransactionRef {
  tx_hash: string | null;
  amount: number | null;
  state: string | null;
}

interface OrderRow {
  id: string;
  order_type: 'BUY' | 'SELL';
  currency_pair: string;
  base_amount: number;
  quote_amount: number;
  price: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  chain_id: number | null;
  input_transaction: TransactionRef | null;
  output_transaction: TransactionRef | null;
}

export const ordersRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get<{ Querystring: OrdersQuery }>(
    '/orders',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const { userAddress, chainId } = req.query;
      const parsedChainId = Number(chainId) || 137;

      if (!userAddress) {
        return reply.code(400).send({ error: 'User address is required' });
      }

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id')
        .ilike('wallet_address', userAddress)
        .maybeSingle();

      if (userError) {
        req.log.error({ err: userError }, 'orders: user lookup failed');
        return reply.code(500).send({ error: 'Failed to look up user' });
      }
      if (!userRow) return reply.code(404).send({ error: 'User not found' });

      const { data: orders, error: ordersError } = await supabase
        .from('trading_orders')
        .select(
          `
            id,
            order_type,
            currency_pair,
            base_amount,
            quote_amount,
            price,
            status,
            created_at,
            completed_at,
            chain_id,
            input_transaction:input_transaction_id(tx_hash, amount, state),
            output_transaction:output_transaction_id(tx_hash, amount, state)
          `,
        )
        .eq('user_id', userRow.id)
        .eq('chain_id', parsedChainId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        req.log.error({ err: ordersError }, 'orders: fetch failed');
        return reply.code(500).send({ error: 'Failed to fetch orders' });
      }

      const transformed = ((orders ?? []) as unknown as OrderRow[]).map((order) => {
        const isBuy = order.order_type === 'BUY';
        const baseTokenSymbol = order.currency_pair.split('/')[0];

        return {
          id: order.id,
          type: order.order_type,
          amount: isBuy ? order.quote_amount : order.base_amount,
          tokenSymbol: baseTokenSymbol,
          tokenName: 'PXO Token',
          status: order.status,
          timestamp: new Date(order.created_at),
          completedAt: order.completed_at ? new Date(order.completed_at) : null,
          txHash: order.input_transaction?.tx_hash,
          pxoTxHash: order.output_transaction?.tx_hash,
          price: order.price,
          baseAmount: isBuy ? order.base_amount : order.quote_amount,
          currencyPair: order.currency_pair,
          fromAddress: '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
          toAddress: userAddress,
          chain_id: order.chain_id ?? 80002,
          inputTransaction: order.input_transaction,
          outputTransaction: order.output_transaction,
        };
      });

      return reply.send({ success: true, orders: transformed });
    },
  );
};

import { getServerSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress, chainId } = req.query;
    const parsedChainId = Number(chainId) || 137;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }

    const supabase = getServerSupabase();

    // Get user ID from wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', userAddress)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get orders with transaction details
    let query = supabase
      .from('trading_orders')
      .select(`
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
        input_transaction:input_transaction_id(
          tx_hash,
          amount,
          state
        ),
        output_transaction:output_transaction_id(
          tx_hash,
          amount,
          state
        )
      `)
      .eq('user_id', user.id);

    query = query.eq('chain_id', parsedChainId);

    const { data: orders, error: ordersError } = await query
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    // Transform orders to match frontend format
    const transformedOrders = (orders || []).map(order => {
      const isBuy = order.order_type === 'BUY';
      const baseTokenSymbol = order.currency_pair.split('/')[0]; // PXO

      return {
        id: order.id,
        type: order.order_type,
        // BUY: amount = PXO comprados (quote_amount)
        // SELL: amount = PXO vendidos (base_amount)
        amount: isBuy ? order.quote_amount : order.base_amount,
        tokenSymbol: baseTokenSymbol,
        tokenName: 'PXO Token',
        status: order.status,
        timestamp: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : null,
        txHash: order.input_transaction?.tx_hash,
        pxoTxHash: order.output_transaction?.tx_hash,
        price: order.price,
        // BUY: baseAmount = stable pagado (base_amount)
        // SELL: baseAmount = stable recibido (quote_amount)
        baseAmount: isBuy ? order.base_amount : order.quote_amount,
        currencyPair: order.currency_pair,
        fromAddress: '0x9f0f2eac50ad04d37d3bf3359735928126ac8382', // System wallet
        toAddress: userAddress,
        chain_id: order.chain_id ?? 80002,
        inputTransaction: order.input_transaction,
        outputTransaction: order.output_transaction
      };
    });

    console.log('✅ Orders fetched:', transformedOrders.length);

    res.status(200).json({
      success: true,
      orders: transformedOrders
    });

  } catch (error) {
    console.error('❌ Error in orders API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

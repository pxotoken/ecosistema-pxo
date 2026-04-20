import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { sendStablecoinToUser } from '../../lib/sendStablecoinToUser.js';
import { getServerLiquidity } from '../../lib/liquidity.js';
import { getServerThirdwebClient } from '../../lib/client.js';
import { getRpcClient, eth_getTransactionReceipt, eth_getTransactionByHash } from 'thirdweb/rpc';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { PricingService, BinancePriceProvider } from '../../lib/services/pricing/index.js';
import { getContract, readContract } from 'thirdweb';

const supabase = getServerSupabase();

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy };
const PXO_TOKEN_ADDRESSES = {
  137: process.env.PXO_TOKEN_ADDRESS_MAINNET,
  80002: process.env.PXO_TOKEN_ADDRESS_TESTNET,
};

const PXO_RECEIVER_ADDRESSES = {
  137: process.env.POLYGON_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
  80002: process.env.POLYGON_AMOY_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
};

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

type SessionUser = { id: string; KYC_status?: string };

async function getCurrentUser(req: VercelRequest): Promise<SessionUser | null> {
  try {
    const cookies = req.headers.cookie;
    if (!cookies) return null;
    const userMatch = cookies.match(/pxo_user=([^;]+)/);
    if (!userMatch) return null;
    const userData = JSON.parse(decodeURIComponent(userMatch[1])) as SessionUser;
    return userData;
  } catch (e) {
    console.error('Error parsing user data:', e);
    return null;
  }
}

type RpcLog = { address?: string; topics?: readonly string[]; data?: string };

function parseTransferLog(log: RpcLog, pxoContractAddress: string) {
  const addr = (log.address || '').toLowerCase();
  const pxo = (pxoContractAddress || '').toLowerCase();
  if (addr !== pxo) return null;
  const topics = log.topics || [];
  if (topics[0] !== TRANSFER_TOPIC) return null;
  const toAddress = topics[2] ? '0x' + topics[2].slice(-40) : null;
  const value = log.data && log.data !== '0x' ? BigInt(log.data) : null;
  return { toAddress: toAddress?.toLowerCase(), value };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Sell PXO API called');

    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.KYC_status !== 'VALIDATED') {
      return res.status(403).json({
        error: 'KYC validation required',
        message: 'Debes completar y validar tu KYC para poder vender PXO',
      });
    }

    const {
      transactionHash,
      pxoAmount,
      userAddress,
      tokenSymbol,
      expectedSellPrice,
      expectedUsdcAmount,
      chainId,
    } = req.body;

    console.log('📝 Sell data:', {
      transactionHash,
      pxoAmount,
      userAddress,
      tokenSymbol,
      expectedSellPrice,
      expectedUsdcAmount,
      chainId,
    });

    if (!transactionHash || pxoAmount == null || !userAddress || !tokenSymbol) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const SUPPORTED_CHAINS = [137, 80002];
    const resolvedChainId = chainId || 137;
    if (!SUPPORTED_CHAINS.includes(resolvedChainId)) {
      return res.status(400).json({ error: `Unsupported chain ID: ${resolvedChainId}` });
    }

    type ChainIdKey = keyof typeof CHAIN_MAP;
    const chainIdKey = resolvedChainId as ChainIdKey;
    const chain = CHAIN_MAP[chainIdKey];
    const pxoContractAddress = PXO_TOKEN_ADDRESSES[chainIdKey];
    const receiverAddress = PXO_RECEIVER_ADDRESSES[chainIdKey];

    if (!pxoContractAddress || !receiverAddress) {
      return res.status(500).json({ error: 'PXO or receiver address not configured for this chain' });
    }

    const { data: token } = await supabase.from('tokens').select('*').eq('symbol', tokenSymbol).single();
    if (!token) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const pricingService = new PricingService(new BinancePriceProvider());
    const sellPriceResult = await pricingService.getSellPrice(`PXO/${tokenSymbol}`);
    const exchangeRate = sellPriceResult.price;
    const calculatedUsdcAmount = pxoAmount * exchangeRate;

    console.log('💰 Sell price:', exchangeRate, 'Calculated USDC:', calculatedUsdcAmount);

    if (expectedSellPrice !== undefined) {
      const diff = Math.abs(exchangeRate - expectedSellPrice);
      const diffPct = (diff / expectedSellPrice) * 100;
      if (diffPct > 2) {
        return res.status(400).json({
          error: 'Price has changed significantly. Please refresh and try again.',
          details: { expectedSellPrice, actualPrice: exchangeRate, tolerance: '2%' },
        });
      }
    }

    if (expectedUsdcAmount !== undefined) {
      const diff = Math.abs(calculatedUsdcAmount - expectedUsdcAmount);
      const diffPct = (diff / expectedUsdcAmount) * 100;
      if (diffPct > 2) {
        return res.status(400).json({
          error: 'Calculated amount differs from expected. Please refresh and try again.',
          details: { expectedUsdcAmount, actualUsdcAmount: calculatedUsdcAmount, tolerance: '2%' },
        });
      }
    }

    const { data: existingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('tx_hash', transactionHash)
      .single();

    if (existingTx) {
      const { data: existingOrder } = await supabase
        .from('trading_orders')
        .select('*')
        .eq('input_transaction_id', existingTx.id)
        .single();

      if (existingOrder && existingOrder.status === 'COMPLETED') {
        let outputTransaction = null;
        if (existingOrder.output_transaction_id) {
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', existingOrder.output_transaction_id)
            .single();
          outputTransaction = data || null;
        }

        return res.status(200).json({
          success: true,
          message: 'PXO sell already completed',
          orderId: existingOrder.id,
          inputTransactionId: existingOrder.input_transaction_id,
          outputTransactionId: existingOrder.output_transaction_id,
          pxoAmount: existingOrder.base_amount,
          usdcAmount: existingOrder.quote_amount,
          tokenSymbol,
          exchangeRate: existingOrder.price,
          usdcTransactionHash: outputTransaction?.tx_hash || null,
        });
      }

      return res.status(400).json({ error: 'Transaction hash has already been used and order is not completed yet' });
    }

    const client = getServerThirdwebClient();
    if (!client) {
      return res.status(500).json({ error: 'Server client not available' });
    }

    const rpcRequest = getRpcClient({ client, chain });
    const tx = await eth_getTransactionByHash(rpcRequest, { hash: transactionHash });
    if (!tx) {
      return res.status(400).json({ error: 'Transaction not found' });
    }

    let receipt = null;
    const pollMs = 2000;
    const timeoutMs = 30000;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        receipt = await eth_getTransactionReceipt(rpcRequest, { hash: transactionHash });
        if (receipt && receipt.status === 'success') break;
        if (receipt && receipt.status === 'reverted') {
          return res.status(400).json({ error: 'Transaction failed on chain' });
        }
      } catch (e: unknown) {
        console.log('Receipt poll:', e instanceof Error ? e.message : e);
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }

    if (!receipt || receipt.status !== 'success') {
      return res.status(400).json({
        error: 'Transaction not confirmed yet. Please wait a moment and try again, or contact support if the transfer was sent.',
      });
    }

    const txFrom = (tx.from || '').toLowerCase();
    const txTo = (tx.to || '').toLowerCase();
    const expectedUser = userAddress.toLowerCase();
    const expectedPxo = pxoContractAddress.toLowerCase();

    console.log('🔎 Sell validation context:', {
      chainId: resolvedChainId,
      txHash: transactionHash,
      txFrom,
      txTo,
      expectedUser,
      expectedPxo,
      expectedReceiver: receiverAddress.toLowerCase(),
    });

    if (txFrom !== expectedUser) {
      return res.status(400).json({ error: 'Transaction was not sent from the provided user address' });
    }
    if (txTo !== expectedPxo) {
      return res.status(400).json({ error: 'Transaction is not a PXO transfer to the exchange' });
    }

    let decimals = 18;
    try {
      const pxoContract = getContract({
        address: pxoContractAddress,
        client,
        chain,
      });
      const onChainDecimals = await readContract({
        contract: pxoContract,
        method: 'function decimals() view returns (uint8)',
        params: [],
      });
      decimals = Number(onChainDecimals);
    } catch (decimalsError) {
      console.error('⚠️ Could not read PXO decimals on-chain, using fallback 18:', decimalsError);
    }

    const expectedRaw = BigInt(Math.floor(pxoAmount * 10 ** decimals));
    const expectedReceiver = receiverAddress.toLowerCase();

    console.log('🔎 Sell amount validation:', {
      pxoAmount,
      decimals,
      expectedRaw: expectedRaw.toString(),
      expectedReceiver,
    });

    let transferFound = null;
    const transferCandidates = [];
    for (const log of receipt.logs || []) {
      const parsed = parseTransferLog(log, pxoContractAddress);
      if (!parsed) continue;
      transferCandidates.push({
        tokenAddress: (log.address || '').toLowerCase(),
        toAddress: parsed.toAddress,
        value: parsed.value?.toString() || null,
      });
      if (parsed.toAddress === expectedReceiver && parsed.value !== null && parsed.value >= expectedRaw) {
        transferFound = parsed;
        break;
      }
    }

    console.log('🔎 Sell transfer candidates:', transferCandidates);

    if (!transferFound) {
      console.error('❌ Sell transfer validation failed:', {
        expectedReceiver,
        expectedRaw: expectedRaw.toString(),
        candidatesCount: transferCandidates.length,
      });
      return res.status(400).json({
        error: 'Valid PXO transfer to exchange not found in this transaction',
      });
    }

    // Liquidity check: do not pay more stablecoin than server wallet has
    const liquidity = await getServerLiquidity(resolvedChainId);
    const stableLiquidity = liquidity?.stable?.balance ?? 0;
    if (calculatedUsdcAmount > stableLiquidity) {
      console.error('❌ Insufficient stablecoin liquidity for PXO sell:', {
        requestedUsdc: calculatedUsdcAmount,
        availableUsdc: stableLiquidity,
      });
      return res.status(400).json({
        error: 'Not enough USDC liquidity to buy this PXO amount. Please reduce the amount or try again later.',
        details: {
          requestedUsdc: calculatedUsdcAmount,
          availableUsdc: stableLiquidity,
        },
      });
    }

    const stablecoinUUID = uuidv4();

    const { data: inputTransaction, error: inputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'wallet',
        destination_uuid: stablecoinUUID,
        from_type: 'user',
        from_uuid: user.id,
        tx_hash: transactionHash,
        amount: pxoAmount,
        state: 'PENDIENTE',
      })
      .select()
      .single();

    if (inputError) {
      console.error('❌ Error creating input transaction:', inputError);
      return res.status(500).json({ error: 'Failed to create input transaction' });
    }

    const { data: order, error: orderError } = await supabase
      .from('trading_orders')
      .insert({
        user_id: user.id,
        order_type: 'SELL',
        currency_pair: `PXO/${tokenSymbol}`,
        base_amount: pxoAmount,
        quote_amount: calculatedUsdcAmount,
        price: exchangeRate,
        status: 'OPEN',
        input_transaction_id: inputTransaction.id,
        chain_id: resolvedChainId,
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    let usdcTxHash;
    try {
      const sendResult = await sendStablecoinToUser({
        amountHuman: calculatedUsdcAmount,
        tokenSymbol: tokenSymbol === 'USDT' ? 'USDT' : 'USDC',
        receiverAddress: userAddress,
        chainId: resolvedChainId,
      });
      usdcTxHash = sendResult.transactionHash;
    } catch (sendErr) {
      console.error('❌ Error sending stablecoin:', sendErr);
      await supabase.from('trading_orders').update({ status: 'FAILED' }).eq('id', order.id);
      return res.status(500).json({
        error: 'Failed to send stablecoin to user',
        details: sendErr instanceof Error ? sendErr.message : 'Unknown error',
      });
    }

    const { data: outputTransaction, error: outputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'user',
        destination_uuid: user.id,
        from_type: 'wallet',
        from_uuid: stablecoinUUID,
        tx_hash: usdcTxHash,
        amount: calculatedUsdcAmount,
        state: 'PAGO_FINALIZADO',
      })
      .select()
      .single();

    if (outputError) {
      console.error('❌ Error creating output transaction:', outputError);
    }

    await supabase
      .from('trading_orders')
      .update({
        output_transaction_id: outputTransaction?.id,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    const result = {
      success: true,
      message: 'PXO sell completed successfully',
      orderId: order.id,
      inputTransactionId: inputTransaction.id,
      outputTransactionId: outputTransaction?.id,
      pxoAmount,
      usdcAmount: calculatedUsdcAmount,
      tokenSymbol,
      exchangeRate,
      usdcTransactionHash: usdcTxHash,
    };

    console.log('✅ Sell completed:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error in sell PXO API:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

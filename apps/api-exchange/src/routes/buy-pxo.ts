import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getContract, readContract } from 'thirdweb';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerSupabase } from '../lib/supabase.js';
import { getServerThirdwebClient } from '../lib/thirdweb-client.js';
import { getServerLiquidity } from '../lib/liquidity.js';
import { PricingService, BinancePriceProvider } from '../lib/pricing/index.js';
import { sendPXOToUser } from '../lib/send-pxo.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import { PXO_TOKEN_ADDRESSES, type SupportedChainId } from '../config/chains.js';

const SUPPORTED_CHAINS: SupportedChainId[] = [137, 80002];
const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;
const PRICE_TOLERANCE_PERCENT = 2;

interface BuyPxoBody {
  transactionHash?: string;
  amount?: number;
  userAddress?: string;
  tokenSymbol?: string;
  expectedPrice?: number;
  expectedPxoAmount?: number;
  chainId?: number;
}

export const buyPxoRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: BuyPxoBody }>('/buy-pxo', { preHandler: requireCaller }, async (req, reply) => {
    const supabase = getServerSupabase();
    const caller = req.caller!;
    const user = await getUserByWallet(caller.walletAddress);
    if (!user) return reply.code(401).send({ error: 'Authentication required' });

    if (user.kyc_status !== 'VALIDATED') {
      return reply.code(403).send({
        error: 'KYC validation required',
        message: 'Debes completar y validar tu KYC para poder comprar PXO',
      });
    }

    const {
      transactionHash,
      amount,
      userAddress,
      tokenSymbol,
      expectedPrice,
      expectedPxoAmount,
      chainId,
    } = req.body ?? {};

    if (!transactionHash || !amount || !userAddress || !tokenSymbol) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }
    if (!chainId) return reply.code(400).send({ error: 'Missing required chainId' });
    if (!SUPPORTED_CHAINS.includes(chainId as SupportedChainId)) {
      return reply.code(400).send({ error: `Unsupported chain ID: ${chainId}` });
    }

    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('symbol', tokenSymbol)
      .single();
    if (tokenError || !token) return reply.code(400).send({ error: 'Invalid token' });

    const pricingService = new PricingService(new BinancePriceProvider());
    const buyPriceResult = await pricingService.getBuyPrice(`PXO/${tokenSymbol}`);
    const exchangeRate = buyPriceResult.price;
    const calculatedPxoAmount = amount / exchangeRate;

    if (expectedPrice !== undefined) {
      const diffPct = (Math.abs(exchangeRate - expectedPrice) / expectedPrice) * 100;
      if (diffPct > PRICE_TOLERANCE_PERCENT) {
        return reply.code(400).send({
          error: 'Price has changed significantly. Please refresh and try again.',
          details: {
            expectedPrice,
            actualPrice: exchangeRate,
            differencePercent: diffPct.toFixed(2) + '%',
            tolerance: PRICE_TOLERANCE_PERCENT + '%',
          },
        });
      }
    }

    const liquidity = await getServerLiquidity(chainId);
    const pxoLiquidity = liquidity?.pxo?.balance ?? 0;
    if (calculatedPxoAmount > pxoLiquidity) {
      return reply.code(400).send({
        error:
          'Not enough PXO liquidity to complete this purchase. Please reduce the amount or try again later.',
        details: { requestedPxo: calculatedPxoAmount, availablePxo: pxoLiquidity },
      });
    }

    if (expectedPxoAmount !== undefined) {
      const diffPct =
        (Math.abs(calculatedPxoAmount - expectedPxoAmount) / expectedPxoAmount) * 100;
      if (diffPct > PRICE_TOLERANCE_PERCENT) {
        return reply.code(400).send({
          error: 'Calculated amount differs from expected. Please refresh and try again.',
          details: {
            expectedPxoAmount,
            actualPxoAmount: calculatedPxoAmount,
            differencePercent: diffPct.toFixed(2) + '%',
            tolerance: PRICE_TOLERANCE_PERCENT + '%',
          },
        });
      }
    }

    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('tx_hash', transactionHash)
      .maybeSingle();
    if (existingTransaction) {
      return reply.code(400).send({ error: 'Transaction hash has already been used' });
    }

    const pxoUUID = randomUUID();

    const { data: inputTransaction, error: inputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'wallet',
        destination_uuid: pxoUUID,
        from_type: 'user',
        from_uuid: user.id,
        tx_hash: transactionHash,
        amount,
        state: 'PENDIENTE',
      })
      .select()
      .single();
    if (inputError) {
      req.log.error({ err: inputError }, 'buy-pxo: create input tx failed');
      return reply.code(500).send({ error: 'Failed to create input transaction' });
    }

    const { data: order, error: orderError } = await supabase
      .from('trading_orders')
      .insert({
        user_id: user.id,
        order_type: 'BUY',
        currency_pair: `PXO/${tokenSymbol}`,
        base_amount: amount,
        quote_amount: calculatedPxoAmount,
        price: exchangeRate,
        status: 'OPEN',
        input_transaction_id: inputTransaction.id,
        chain_id: chainId,
      })
      .select()
      .single();
    if (orderError) {
      req.log.error({ err: orderError }, 'buy-pxo: create order failed');
      return reply.code(500).send({ error: 'Failed to create order' });
    }

    const resolvedChainId = chainId as SupportedChainId;
    const selectedChain = CHAIN_MAP[resolvedChainId];
    const pxoContractAddress = PXO_TOKEN_ADDRESSES[resolvedChainId];
    if (!selectedChain || !pxoContractAddress) {
      return reply
        .code(500)
        .send({ error: 'PXO token address not configured for selected chain' });
    }

    let decimals = 18;
    try {
      const client = getServerThirdwebClient();
      if (!client) throw new Error('Server Thirdweb client not available');
      const pxoContract = getContract({ address: pxoContractAddress, client, chain: selectedChain });
      const onChainDecimals = await readContract({
        contract: pxoContract,
        method: 'function decimals() view returns (uint8)',
        params: [],
      });
      decimals = Number(onChainDecimals);
    } catch (err) {
      req.log.warn({ err }, 'buy-pxo: could not read PXO decimals, fallback 18');
    }

    const pxoQuantity = BigInt(Math.floor(calculatedPxoAmount * 10 ** decimals));

    let pxoTxHash: string;
    try {
      const pxoResult = await sendPXOToUser({
        quantity: pxoQuantity,
        receiverAddress: userAddress,
        chainId,
      });
      pxoTxHash = pxoResult.transactionHash;
    } catch (err) {
      req.log.error({ err }, 'buy-pxo: send PXO failed');
      await supabase.from('trading_orders').update({ status: 'FAILED' }).eq('id', order.id);
      return reply.code(500).send({
        error: 'Failed to send PXO tokens',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    const { data: outputTransaction, error: outputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'user',
        destination_uuid: user.id,
        from_type: 'wallet',
        from_uuid: pxoUUID,
        tx_hash: pxoTxHash,
        amount: calculatedPxoAmount,
        state: 'PAGO_FINALIZADO',
      })
      .select()
      .single();
    if (outputError) {
      req.log.error({ err: outputError }, 'buy-pxo: create output tx failed');
      return reply.code(500).send({ error: 'Failed to create output transaction' });
    }

    const { error: updateError } = await supabase
      .from('trading_orders')
      .update({
        output_transaction_id: outputTransaction.id,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    if (updateError) {
      req.log.warn({ err: updateError }, 'buy-pxo: update order failed (non-fatal)');
    }

    return reply.send({
      success: true,
      message: 'PXO purchase completed successfully',
      orderId: order.id,
      inputTransactionId: inputTransaction.id,
      outputTransactionId: outputTransaction.id,
      pxoAmount: calculatedPxoAmount,
      tokenAmount: amount,
      tokenSymbol,
      exchangeRate,
      pxoTransactionHash: pxoTxHash,
    });
  });
};

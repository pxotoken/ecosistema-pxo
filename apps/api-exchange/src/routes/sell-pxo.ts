import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getContract, readContract } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt, eth_getTransactionByHash } from 'thirdweb/rpc';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerSupabase } from '../lib/supabase.js';
import { getServerThirdwebClient } from '../lib/thirdweb-client.js';
import { getServerLiquidity } from '../lib/liquidity.js';
import { PricingService, BinancePriceProvider } from '../lib/pricing/index.js';
import { sendStablecoinToUser } from '../lib/send-stablecoin.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import {
  PXO_TOKEN_ADDRESSES,
  PXO_RECEIVER_ADDRESSES,
  type SupportedChainId,
} from '../config/chains.js';

const SUPPORTED_CHAINS: SupportedChainId[] = [137, 80002];
const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const PRICE_TOLERANCE_PERCENT = 2;

interface SellPxoBody {
  transactionHash?: string;
  pxoAmount?: number;
  userAddress?: string;
  tokenSymbol?: string;
  expectedSellPrice?: number;
  expectedUsdcAmount?: number;
  chainId?: number;
}

type RpcLog = { address?: string; topics?: readonly string[]; data?: string };

function parseTransferLog(log: RpcLog, pxoContractAddress: string) {
  const addr = (log.address || '').toLowerCase();
  const pxo = pxoContractAddress.toLowerCase();
  if (addr !== pxo) return null;
  const topics = log.topics || [];
  if (topics[0] !== TRANSFER_TOPIC) return null;
  const toAddress = topics[2] ? '0x' + topics[2].slice(-40) : null;
  const value = log.data && log.data !== '0x' ? BigInt(log.data) : null;
  return { toAddress: toAddress?.toLowerCase(), value };
}

export const sellPxoRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: SellPxoBody }>(
    '/sell-pxo',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      if (user.kyc_status !== 'VALIDATED') {
        return reply.code(403).send({
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
      } = req.body ?? {};

      if (!transactionHash || pxoAmount == null || !userAddress || !tokenSymbol) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      const resolvedChainId = (chainId ?? 137) as SupportedChainId;
      if (!SUPPORTED_CHAINS.includes(resolvedChainId)) {
        return reply.code(400).send({ error: `Unsupported chain ID: ${resolvedChainId}` });
      }

      const chain = CHAIN_MAP[resolvedChainId];
      const pxoContractAddress = PXO_TOKEN_ADDRESSES[resolvedChainId];
      const receiverAddress = PXO_RECEIVER_ADDRESSES[resolvedChainId];
      if (!pxoContractAddress || !receiverAddress) {
        return reply
          .code(500)
          .send({ error: 'PXO or receiver address not configured for this chain' });
      }

      const { data: token } = await supabase
        .from('tokens')
        .select('*')
        .eq('symbol', tokenSymbol)
        .maybeSingle();
      if (!token) return reply.code(400).send({ error: 'Invalid token' });

      const pricingService = new PricingService(new BinancePriceProvider());
      const sellPriceResult = await pricingService.getSellPrice(`PXO/${tokenSymbol}`);
      const exchangeRate = sellPriceResult.price;
      const calculatedUsdcAmount = pxoAmount * exchangeRate;

      if (expectedSellPrice !== undefined) {
        const diffPct =
          (Math.abs(exchangeRate - expectedSellPrice) / expectedSellPrice) * 100;
        if (diffPct > PRICE_TOLERANCE_PERCENT) {
          return reply.code(400).send({
            error: 'Price has changed significantly. Please refresh and try again.',
            details: {
              expectedSellPrice,
              actualPrice: exchangeRate,
              tolerance: PRICE_TOLERANCE_PERCENT + '%',
            },
          });
        }
      }

      if (expectedUsdcAmount !== undefined) {
        const diffPct =
          (Math.abs(calculatedUsdcAmount - expectedUsdcAmount) / expectedUsdcAmount) * 100;
        if (diffPct > PRICE_TOLERANCE_PERCENT) {
          return reply.code(400).send({
            error: 'Calculated amount differs from expected. Please refresh and try again.',
            details: {
              expectedUsdcAmount,
              actualUsdcAmount: calculatedUsdcAmount,
              tolerance: PRICE_TOLERANCE_PERCENT + '%',
            },
          });
        }
      }

      const { data: existingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('tx_hash', transactionHash)
        .maybeSingle();

      if (existingTx) {
        const { data: existingOrder } = await supabase
          .from('trading_orders')
          .select('*')
          .eq('input_transaction_id', existingTx.id)
          .maybeSingle();

        if (existingOrder && existingOrder.status === 'COMPLETED') {
          let outputTransaction = null;
          if (existingOrder.output_transaction_id) {
            const { data } = await supabase
              .from('transactions')
              .select('*')
              .eq('id', existingOrder.output_transaction_id)
              .maybeSingle();
            outputTransaction = data ?? null;
          }

          return reply.send({
            success: true,
            message: 'PXO sell already completed',
            orderId: existingOrder.id,
            inputTransactionId: existingOrder.input_transaction_id,
            outputTransactionId: existingOrder.output_transaction_id,
            pxoAmount: existingOrder.base_amount,
            usdcAmount: existingOrder.quote_amount,
            tokenSymbol,
            exchangeRate: existingOrder.price,
            usdcTransactionHash: outputTransaction?.tx_hash ?? null,
          });
        }

        return reply.code(400).send({
          error: 'Transaction hash has already been used and order is not completed yet',
        });
      }

      const client = getServerThirdwebClient();
      if (!client) return reply.code(500).send({ error: 'Server client not available' });

      const rpcRequest = getRpcClient({ client, chain });
      const tx = await eth_getTransactionByHash(rpcRequest, {
        hash: transactionHash as `0x${string}`,
      });
      if (!tx) return reply.code(400).send({ error: 'Transaction not found' });

      let receipt: Awaited<ReturnType<typeof eth_getTransactionReceipt>> | null = null;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        try {
          receipt = await eth_getTransactionReceipt(rpcRequest, {
            hash: transactionHash as `0x${string}`,
          });
          if (receipt && receipt.status === 'success') break;
          if (receipt && receipt.status === 'reverted') {
            return reply.code(400).send({ error: 'Transaction failed on chain' });
          }
        } catch (err) {
          req.log.debug({ err }, 'sell-pxo: receipt poll');
        }
        await new Promise((r) => setTimeout(r, 2_000));
      }

      if (!receipt || receipt.status !== 'success') {
        return reply.code(400).send({
          error:
            'Transaction not confirmed yet. Please wait a moment and try again, or contact support if the transfer was sent.',
        });
      }

      const txFrom = (tx.from || '').toLowerCase();
      const txTo = (tx.to || '').toLowerCase();
      const expectedUser = userAddress.toLowerCase();
      const expectedPxo = pxoContractAddress.toLowerCase();

      if (txFrom !== expectedUser) {
        return reply
          .code(400)
          .send({ error: 'Transaction was not sent from the provided user address' });
      }
      if (txTo !== expectedPxo) {
        return reply
          .code(400)
          .send({ error: 'Transaction is not a PXO transfer to the exchange' });
      }

      let decimals = 18;
      try {
        const pxoContract = getContract({ address: pxoContractAddress, client, chain });
        const onChainDecimals = await readContract({
          contract: pxoContract,
          method: 'function decimals() view returns (uint8)',
          params: [],
        });
        decimals = Number(onChainDecimals);
      } catch (err) {
        req.log.warn({ err }, 'sell-pxo: could not read PXO decimals, fallback 18');
      }

      const expectedRaw = BigInt(Math.floor(pxoAmount * 10 ** decimals));
      const expectedReceiver = receiverAddress.toLowerCase();

      let transferFound = null;
      for (const log of receipt.logs || []) {
        const parsed = parseTransferLog(log, pxoContractAddress);
        if (!parsed) continue;
        if (
          parsed.toAddress === expectedReceiver &&
          parsed.value !== null &&
          parsed.value >= expectedRaw
        ) {
          transferFound = parsed;
          break;
        }
      }

      if (!transferFound) {
        return reply
          .code(400)
          .send({ error: 'Valid PXO transfer to exchange not found in this transaction' });
      }

      const liquidity = await getServerLiquidity(resolvedChainId);
      const stableLiquidity = liquidity?.stable?.balance ?? 0;
      if (calculatedUsdcAmount > stableLiquidity) {
        return reply.code(400).send({
          error:
            'Not enough USDC liquidity to buy this PXO amount. Please reduce the amount or try again later.',
          details: {
            requestedUsdc: calculatedUsdcAmount,
            availableUsdc: stableLiquidity,
          },
        });
      }

      const stablecoinUUID = randomUUID();

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
        req.log.error({ err: inputError }, 'sell-pxo: create input tx failed');
        return reply.code(500).send({ error: 'Failed to create input transaction' });
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
        req.log.error({ err: orderError }, 'sell-pxo: create order failed');
        return reply.code(500).send({ error: 'Failed to create order' });
      }

      let usdcTxHash: string | null;
      try {
        const sendResult = await sendStablecoinToUser({
          amountHuman: calculatedUsdcAmount,
          tokenSymbol: tokenSymbol === 'USDT' ? 'USDT' : 'USDC',
          receiverAddress: userAddress,
          chainId: resolvedChainId,
        });
        usdcTxHash = sendResult.transactionHash;
      } catch (err) {
        req.log.error({ err }, 'sell-pxo: send stablecoin failed');
        await supabase.from('trading_orders').update({ status: 'FAILED' }).eq('id', order.id);
        return reply.code(500).send({
          error: 'Failed to send stablecoin to user',
          details: err instanceof Error ? err.message : 'Unknown error',
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
        req.log.warn({ err: outputError }, 'sell-pxo: create output tx failed (non-fatal)');
      }

      await supabase
        .from('trading_orders')
        .update({
          output_transaction_id: outputTransaction?.id,
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      return reply.send({
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
      });
    },
  );
};

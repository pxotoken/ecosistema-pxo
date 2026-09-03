import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getContract } from 'thirdweb/contract';
import { prepareContractCall, prepareTransaction, sendTransaction } from 'thirdweb/transaction';
import { estimateGas, getGasPrice } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt } from 'thirdweb/rpc';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { env } from '../config/env.js';
import { getServerSupabase } from '../lib/supabase.js';
import { getServerThirdwebClient } from '../lib/thirdweb-client.js';
import { getDecryptedWalletKey } from '../lib/wallet-key.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import {
  STABLECOIN_CONTRACTS,
  PXO_RECEIVER_ADDRESSES,
  PXO_TOKEN_ADDRESSES,
  PXO_SELL_SUPPORTED_CHAIN_IDS,
  DEFAULT_TOKEN_TYPE,
  TOKEN_TRANSFER_GAS_LIMIT,
  type SupportedChainId,
} from '../config/chains.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;

interface GasSubsidyBody {
  userAddress?: string;
  paymentAmount?: number;
  chainId?: number;
  tokenType?: 'USDC' | 'USDT';
  source?: 'exchange' | 'transfer';
  tokenContractAddress?: string;
  receiverAddress?: string;
  tokenDecimals?: number;
  forPxoSell?: boolean;
}

export const gasSubsidyRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: GasSubsidyBody }>(
    '/gas-subsidy',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      const {
        userAddress,
        paymentAmount,
        chainId,
        tokenType,
        source,
        tokenContractAddress: directTokenAddress,
        receiverAddress: directReceiverAddress,
        tokenDecimals: directDecimals,
        forPxoSell,
      } = req.body ?? {};

      if (!userAddress || !chainId) {
        return reply
          .code(400)
          .send({ error: 'Missing required fields: userAddress, chainId' });
      }
      if (source !== 'transfer' && (paymentAmount == null || paymentAmount < 0)) {
        return reply.code(400).send({
          error: 'Missing required fields: paymentAmount (required for exchange)',
        });
      }

      const chain = CHAIN_MAP[chainId as SupportedChainId];
      if (!chain) {
        return reply.code(400).send({ error: `Unsupported chain ID: ${chainId}` });
      }
      const chainKey = chainId as SupportedChainId;

      let resolvedTokenAddress: string;
      let resolvedReceiverAddress: string;
      let resolvedDecimals: number;
      let resolvedTokenLabel: string;

      if (source === 'transfer') {
        if (!directTokenAddress || !directReceiverAddress) {
          return reply.code(400).send({
            error:
              'Missing required fields for transfer: tokenContractAddress, receiverAddress',
          });
        }
        if (forPxoSell) {
          if (!PXO_SELL_SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)) {
            return reply.code(400).send({
              error: 'PXO sell is only supported on Polygon (137) or Amoy (80002).',
            });
          }
          const sellChain = chainId as SupportedChainId;
          const expectedToken = PXO_TOKEN_ADDRESSES[sellChain];
          const expectedReceiver = PXO_RECEIVER_ADDRESSES[chainKey];
          if (!expectedToken || !expectedReceiver) {
            return reply.code(500).send({
              error: 'PXO or receiver address not configured for this chain',
            });
          }
          const norm = (a: string) => a.trim().toLowerCase();
          if (norm(directTokenAddress) !== norm(expectedToken)) {
            return reply.code(400).send({
              error: 'Token contract does not match the configured PXO address for this chain.',
            });
          }
          if (norm(directReceiverAddress) !== norm(expectedReceiver)) {
            return reply.code(400).send({
              error: 'Receiver address does not match the exchange deposit address for this chain.',
            });
          }
        }
        resolvedTokenAddress = directTokenAddress;
        resolvedReceiverAddress = directReceiverAddress;
        resolvedDecimals = directDecimals ?? 18;
        resolvedTokenLabel = 'transfer';
      } else {
        const selectedTokenType = tokenType ?? DEFAULT_TOKEN_TYPE[chainKey];
        if (!selectedTokenType) {
          return reply
            .code(400)
            .send({ error: `No default token configured for chain ID: ${chainId}` });
        }
        resolvedTokenAddress = STABLECOIN_CONTRACTS[chainKey]?.[selectedTokenType];
        if (!resolvedTokenAddress) {
          return reply.code(400).send({
            error: `${selectedTokenType} contract not configured for chain ID: ${chainId}`,
          });
        }
        resolvedReceiverAddress = PXO_RECEIVER_ADDRESSES[chainKey];
        if (!resolvedReceiverAddress) {
          return reply
            .code(400)
            .send({ error: `PXO receiver address not configured for chain ID: ${chainId}` });
        }
        resolvedDecimals = selectedTokenType === 'USDT' ? USDT_DECIMALS : USDC_DECIMALS;
        resolvedTokenLabel = selectedTokenType;
      }

      const client = getServerThirdwebClient();
      if (!client) {
        return reply.code(500).send({
          error:
            'Server client not available. Check THIRDWEB_SECRET_KEY environment variable.',
        });
      }

      const paymentAmountInDecimals =
        source === 'transfer'
          ? BigInt(1)
          : BigInt(Math.floor((paymentAmount ?? 0) * 10 ** resolvedDecimals));

      const contract = getContract({ address: resolvedTokenAddress, client, chain });
      const amountForGasEstimate = source === 'transfer' ? BigInt(1) : paymentAmountInDecimals;

      const estimateTx = prepareContractCall({
        contract,
        method: 'function transfer(address to, uint256 value)',
        params: [resolvedReceiverAddress, amountForGasEstimate],
      });

      const estimatedGas = await estimateGas({ transaction: estimateTx, from: userAddress });

      let gasPrice: bigint;
      try {
        gasPrice = await getGasPrice({ client, chain });
        if (chainId === 80002 && gasPrice < BigInt(25_000_000_000)) {
          gasPrice = BigInt(30_000_000_000);
        }
      } catch {
        gasPrice = chainId === 80002 ? BigInt(30_000_000_000) : BigInt(20_000_000_000);
      }

      // Size the subsidy off the gas limit the user's transfer will actually
      // send (TOKEN_TRANSFER_GAS_LIMIT), not the RPC estimate — the estimate
      // can undershoot the fixed 100k cap, leaving the wallet short. Guard with
      // max() so a future token needing more than the cap is still covered.
      const gasUnitsToFund =
        estimatedGas > TOKEN_TRANSFER_GAS_LIMIT ? estimatedGas : TOKEN_TRANSFER_GAS_LIMIT;
      // 150% of gas cost, to absorb gasPrice drift before the transfer is sent.
      const subsidyAmount = (gasUnitsToFund * gasPrice * BigInt(15)) / BigInt(10);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSubsidies } = await supabase
        .from('gas_subsidies')
        .select('created_at, amount')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      const maxPerDay = env.MAX_GAS_SUBSIDIES_PER_DAY;
      const minIntervalMs = env.GAS_SUBSIDY_MIN_INTERVAL_MINUTES * 60 * 1000;
      const maxDailyAmount = env.MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI
        ? BigInt(env.MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI)
        : null;

      if (recentSubsidies?.length) {
        if (recentSubsidies.length >= maxPerDay) {
          const oldestInWindow = new Date(
            recentSubsidies[recentSubsidies.length - 1].created_at,
          ).getTime();
          const resetMinutes = Math.ceil(
            (oldestInWindow + 24 * 60 * 60 * 1000 - Date.now()) / 60_000,
          );
          return reply.code(429).send({
            error: `Has alcanzado el límite de ${maxPerDay} subsidios por día. Se reinicia en ~${resetMinutes} min.`,
            needsSubsidy: true,
            remaining: 0,
            resetInMinutes: resetMinutes,
          });
        }

        const lastTime = new Date(recentSubsidies[0].created_at).getTime();
        const elapsed = Date.now() - lastTime;
        if (elapsed < minIntervalMs) {
          const waitSeconds = Math.ceil((minIntervalMs - elapsed) / 1000);
          return reply.code(429).send({
            error: `Espera ${waitSeconds} segundos antes de solicitar otro subsidio.`,
            needsSubsidy: true,
            remaining: maxPerDay - recentSubsidies.length,
            waitSeconds,
          });
        }

        if (maxDailyAmount) {
          const totalToday = recentSubsidies.reduce(
            (sum, s: { amount?: string | null }) => sum + BigInt(s.amount ?? '0'),
            BigInt(0),
          );
          if (totalToday + subsidyAmount > maxDailyAmount) {
            return reply.code(429).send({
              error: 'Has alcanzado el monto máximo de subsidio diario.',
              needsSubsidy: true,
              remaining: maxPerDay - recentSubsidies.length,
            });
          }
        }
      }

      let privateKey: string;
      try {
        privateKey = await getDecryptedWalletKey();
      } catch (err) {
        req.log.error({ err }, 'gas-subsidy: wallet key decryption failed');
        return reply.code(500).send({
          error:
            'Server wallet not configured. Check WALLET_PRIVATE_KEY or WALLET_PRIVATE_KEY_ENCRYPTED environment variables.',
        });
      }
      if (!privateKey) {
        return reply.code(500).send({
          error: 'Server wallet not configured. Check WALLET_PRIVATE_KEY environment variable.',
        });
      }

      const subsidyWallet = privateKeyToAccount({ client, privateKey });

      const transaction = prepareTransaction({
        to: userAddress,
        value: subsidyAmount,
        chain,
        client,
        gas: estimatedGas,
        gasPrice,
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: subsidyWallet,
      });

      const rpcRequest = getRpcClient({ client, chain });
      const deadline = Date.now() + 25_000;
      while (Date.now() < deadline) {
        try {
          const receipt = await eth_getTransactionReceipt(rpcRequest, {
            hash: transactionHash as `0x${string}`,
          });
          if (receipt && receipt.status === 'success') break;
        } catch (err) {
          req.log.debug({ err }, 'gas-subsidy: receipt poll');
        }
        await new Promise((r) => setTimeout(r, 2_000));
      }

      const { error: insertError } = await supabase.from('gas_subsidies').insert({
        user_id: user.id,
        address: userAddress,
        amount: subsidyAmount.toString(),
        tx_hash: transactionHash,
      });
      if (insertError) {
        req.log.warn({ err: insertError }, 'gas-subsidy: insert record failed (non-fatal)');
      }

      return reply.send({
        success: true,
        needsSubsidy: true,
        subsidyTxHash: transactionHash,
        estimatedGas: estimatedGas.toString(),
        subsidyAmount: subsidyAmount.toString(),
        source: source ?? 'exchange',
        chainId,
        message: `Subsidio de gas enviado exitosamente (${resolvedTokenLabel})`,
      });
    },
  );
};

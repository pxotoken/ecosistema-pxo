import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getContract, readContract } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt, eth_getTransactionByHash } from 'thirdweb/rpc';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerSupabase } from '../lib/supabase.js';
import { getServerThirdwebClient } from '../lib/thirdweb-client.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import {
  PXO_TOKEN_ADDRESSES,
  PXO_RECEIVER_ADDRESSES,
  PXO_SELL_SUPPORTED_CHAIN_IDS,
  type SupportedChainId,
} from '../config/chains.js';
import {
  bitsoCreateSpeiWithdrawal,
  bitsoGetWithdrawalStatus,
  BITSO_COMPLETE_STATUSES,
  BITSO_FAILED_STATUSES,
} from '../lib/bitso.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface CreateIntentBody {
  pxoAmount?: number;
  clabe?: string;
  beneficiaryName?: string;
  chainId?: number;
}

interface ConfirmIntentBody {
  transactionHash?: string;
  userAddress?: string;
}

type RpcLog = { address?: string; topics?: readonly string[]; data?: string };

function parseTransferLog(log: RpcLog, pxoContractAddress: string) {
  const addr = (log.address || '').toLowerCase();
  if (addr !== pxoContractAddress.toLowerCase()) return null;
  const topics = log.topics || [];
  if (topics[0] !== TRANSFER_TOPIC) return null;
  const toAddress = topics[2] ? '0x' + topics[2].slice(-40) : null;
  const value = log.data && log.data !== '0x' ? BigInt(log.data) : null;
  return { toAddress: toAddress?.toLowerCase(), value };
}

/**
 * Fiat off-ramp (PXO → MXN via Bitso SPEI).
 *
 * Flow:
 *   1) POST /sell-pxo-mxn           — create redemption intent, return treasury address
 *   2) (user signs PXO transfer to treasury wallet on-chain)
 *   3) POST /sell-pxo-mxn/:id/confirm — verify on-chain leg, instruct Bitso SPEI
 *   4) (Bitso webhook eventually marks intent COMPLETED)
 *   5) GET /sell-pxo-mxn/:id        — frontend polling
 *
 * Sequencing is escrow-first / SPEI-second: we only ask Bitso to pay out
 * after we've confirmed the PXO is in our treasury wallet. SPEI is
 * irreversible; the on-chain leg is. We do the reversible thing first.
 */
export const sellPxoMxnRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Step 1: create redemption intent
  app.post<{ Body: CreateIntentBody }>(
    '/sell-pxo-mxn',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      if (user.kyc_status !== 'VALIDATED') {
        return reply.code(403).send({
          error: 'KYC validation required',
          message: 'Debes completar y validar tu KYC para poder vender PXO a MXN',
        });
      }

      const { pxoAmount, clabe, beneficiaryName, chainId } = req.body ?? {};
      if (!pxoAmount || pxoAmount <= 0 || !clabe || !beneficiaryName || !chainId) {
        return reply.code(400).send({ error: 'Missing or invalid required fields' });
      }
      if (!PXO_SELL_SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)) {
        return reply.code(400).send({ error: `Unsupported chain ID: ${chainId}` });
      }
      if (!/^\d{18}$/.test(clabe)) {
        return reply.code(400).send({ error: 'CLABE must be 18 digits' });
      }

      const resolvedChainId = chainId as SupportedChainId;
      const treasuryAddress = PXO_RECEIVER_ADDRESSES[resolvedChainId];
      if (!treasuryAddress) {
        return reply.code(500).send({ error: 'Treasury address not configured for chain' });
      }

      const mxnAmount = pxoAmount; // 1:1 peg

      const { data: intent, error } = await supabase
        .from('redemption_intents')
        .insert({
          user_id: user.id,
          pxo_amount: pxoAmount,
          mxn_amount: mxnAmount,
          clabe,
          beneficiary_name: beneficiaryName,
          status: 'AWAITING_PXO',
        })
        .select()
        .single();
      if (error) {
        req.log.error({ err: error }, 'sell-pxo-mxn: create intent failed');
        return reply.code(500).send({ error: 'Failed to create redemption intent' });
      }

      return reply.send({
        success: true,
        intentId: intent.id,
        treasuryAddress,
        pxoAmount,
        mxnAmount,
        chainId: resolvedChainId,
        status: intent.status,
        message:
          'Intent created. Transfer the PXO to the treasury address on-chain, then call /confirm with the transaction hash.',
      });
    },
  );

  // Step 3: confirm on-chain transfer happened, kick off SPEI
  app.post<{ Body: ConfirmIntentBody; Params: { id: string } }>(
    '/sell-pxo-mxn/:id/confirm',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      const { transactionHash, userAddress } = req.body ?? {};
      if (!transactionHash || !userAddress) {
        return reply.code(400).send({ error: 'transactionHash and userAddress are required' });
      }

      const { data: intent, error: intentError } = await supabase
        .from('redemption_intents')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (intentError) {
        req.log.error({ err: intentError }, 'sell-pxo-mxn confirm: lookup failed');
        return reply.code(500).send({ error: 'Lookup failed' });
      }
      if (!intent) return reply.code(404).send({ error: 'Intent not found' });
      if (intent.status !== 'AWAITING_PXO') {
        return reply.send({
          success: true,
          status: intent.status,
          message: 'Intent already past AWAITING_PXO stage',
        });
      }

      const resolvedChainId = 80002 as SupportedChainId; // default Amoy; could persist on intent if multi-chain
      const chain = CHAIN_MAP[resolvedChainId];
      const pxoContractAddress = PXO_TOKEN_ADDRESSES[resolvedChainId];
      const treasuryAddress = PXO_RECEIVER_ADDRESSES[resolvedChainId];
      if (!pxoContractAddress || !treasuryAddress) {
        return reply.code(500).send({ error: 'Chain not configured' });
      }

      const client = getServerThirdwebClient();
      if (!client) return reply.code(500).send({ error: 'Server client not available' });

      // Verify on-chain leg — clone of sell-pxo.ts verification.
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
          req.log.debug({ err }, 'sell-pxo-mxn confirm: receipt poll');
        }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      if (!receipt || receipt.status !== 'success') {
        return reply.code(400).send({
          error:
            'Transaction not confirmed yet. Please wait a moment and try again, or contact support.',
        });
      }

      const txFrom = (tx.from || '').toLowerCase();
      const txTo = (tx.to || '').toLowerCase();
      if (txFrom !== userAddress.toLowerCase()) {
        return reply.code(400).send({ error: 'Transaction was not sent from the provided user address' });
      }
      if (txTo !== pxoContractAddress.toLowerCase()) {
        return reply.code(400).send({ error: 'Transaction is not a PXO transfer to the exchange' });
      }

      let decimals = 18;
      try {
        const pxoContract = getContract({ address: pxoContractAddress, client, chain });
        decimals = Number(
          await readContract({
            contract: pxoContract,
            method: 'function decimals() view returns (uint8)',
            params: [],
          }),
        );
      } catch (err) {
        req.log.warn({ err }, 'sell-pxo-mxn confirm: decimals read failed, using 18');
      }

      const expectedRaw = BigInt(Math.floor(Number(intent.pxo_amount) * 10 ** decimals));
      const expectedReceiver = treasuryAddress.toLowerCase();

      let transferFound = false;
      for (const log of receipt.logs || []) {
        const parsed = parseTransferLog(log, pxoContractAddress);
        if (!parsed) continue;
        if (parsed.toAddress === expectedReceiver && parsed.value !== null && parsed.value >= expectedRaw) {
          transferFound = true;
          break;
        }
      }
      if (!transferFound) {
        return reply
          .code(400)
          .send({ error: 'Valid PXO transfer to treasury not found in this transaction' });
      }

      // Atomic state transition: AWAITING_PXO → PXO_RECEIVED
      const { data: claimed, error: claimError } = await supabase
        .from('redemption_intents')
        .update({ status: 'PXO_RECEIVED' })
        .eq('id', intent.id)
        .eq('status', 'AWAITING_PXO')
        .select()
        .maybeSingle();
      if (claimError) {
        req.log.error({ err: claimError }, 'sell-pxo-mxn confirm: state transition failed');
        return reply.code(500).send({ error: 'State transition failed' });
      }
      if (!claimed) {
        return reply.send({ success: true, status: 'PXO_RECEIVED', message: 'Already advanced' });
      }

      // Create a trading_order record mirroring the crypto sell-pxo shape.
      const { data: order, error: orderError } = await supabase
        .from('trading_orders')
        .insert({
          user_id: user.id,
          order_type: 'SELL',
          currency_pair: 'PXO/MXN',
          base_amount: intent.pxo_amount,
          quote_amount: intent.mxn_amount,
          price: 1,
          status: 'OPEN',
          chain_id: resolvedChainId,
          payment_method: 'bitso_spei',
          external_ref: null, // will fill with bitso wid below
        })
        .select()
        .single();
      if (orderError) {
        req.log.error({ err: orderError }, 'sell-pxo-mxn confirm: create trading_order failed');
        return reply.code(500).send({ error: 'Failed to create trading order' });
      }

      // Record the inbound PXO transaction (user → treasury).
      const { data: inputTx } = await supabase
        .from('transactions')
        .insert({
          destination_type: 'wallet',
          destination_uuid: treasuryAddress,
          from_type: 'user',
          from_uuid: user.id,
          tx_hash: transactionHash,
          amount: intent.pxo_amount,
          state: 'PAGO_FINALIZADO',
        })
        .select()
        .single();
      if (inputTx) {
        await supabase
          .from('trading_orders')
          .update({ input_transaction_id: inputTx.id })
          .eq('id', order.id);
      }

      // Instruct Bitso SPEI. originId is the intent_id — idempotency for
      // repeat /confirm calls.
      let wid: string;
      try {
        const result = await bitsoCreateSpeiWithdrawal({
          amountMxn: Number(intent.mxn_amount),
          clabe: intent.clabe,
          beneficiaryName: intent.beneficiary_name,
          originId: intent.id,
          concept: 'Redencion PXO',
        });
        wid = result.wid;
      } catch (err) {
        req.log.error({ err, intentId: intent.id }, 'sell-pxo-mxn confirm: Bitso SPEI failed');
        await supabase
          .from('redemption_intents')
          .update({ status: 'FAILED', failure_reason: 'Bitso withdrawal failed' })
          .eq('id', intent.id);
        await supabase.from('trading_orders').update({ status: 'FAILED' }).eq('id', order.id);
        return reply.code(502).send({
          error: 'Failed to initiate SPEI',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      await supabase
        .from('redemption_intents')
        .update({
          status: 'SPEI_SENT',
          bitso_withdrawal_id: wid,
          trading_order_id: order.id,
        })
        .eq('id', intent.id);
      await supabase
        .from('trading_orders')
        .update({ external_ref: wid, status: 'PROCESSING' })
        .eq('id', order.id);

      return reply.send({
        success: true,
        intentId: intent.id,
        tradingOrderId: order.id,
        bitsoWithdrawalId: wid,
        status: 'SPEI_SENT',
        message: 'SPEI initiated. Awaiting Bitso confirmation.',
      });
    },
  );

  // Polling endpoint for the frontend.
  //
  // Includes a Bitso polling fallback: when the intent is in SPEI_SENT,
  // we call Bitso directly to check the withdrawal status. This makes
  // the demo work without a configured Bitso webhook (which on stage is
  // not self-serve in the dashboard). Once a real webhook is wired up
  // for production, the conditional UPDATE below loses any race against
  // the webhook handler gracefully.
  app.get<{ Params: { id: string } }>(
    '/sell-pxo-mxn/:id',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      const intentSelect =
        'id, status, pxo_amount, mxn_amount, clabe, beneficiary_name, bitso_withdrawal_id, trading_order_id, failure_reason, created_at, updated_at';

      const { data: initialIntent, error } = await supabase
        .from('redemption_intents')
        .select(intentSelect)
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return reply.code(500).send({ error: 'Lookup failed' });
      if (!initialIntent) return reply.code(404).send({ error: 'Intent not found' });

      let intent = initialIntent;

      if (intent.status === 'SPEI_SENT' && intent.bitso_withdrawal_id) {
        try {
          const w = await bitsoGetWithdrawalStatus(intent.bitso_withdrawal_id);
          if (w) {
            if (BITSO_COMPLETE_STATUSES.has(w.status)) {
              const { data: updated } = await supabase
                .from('redemption_intents')
                .update({ status: 'COMPLETED' })
                .eq('id', intent.id)
                .eq('status', 'SPEI_SENT')
                .select(intentSelect)
                .maybeSingle();
              if (updated) {
                if (intent.trading_order_id) {
                  await supabase
                    .from('trading_orders')
                    .update({
                      status: 'COMPLETED',
                      completed_at: new Date().toISOString(),
                    })
                    .eq('id', intent.trading_order_id);
                }
                intent = updated;
              }
            } else if (BITSO_FAILED_STATUSES.has(w.status)) {
              const { data: updated } = await supabase
                .from('redemption_intents')
                .update({
                  status: 'FAILED',
                  failure_reason: `Bitso withdrawal status: ${w.status}`,
                })
                .eq('id', intent.id)
                .eq('status', 'SPEI_SENT')
                .select(intentSelect)
                .maybeSingle();
              if (updated) {
                if (intent.trading_order_id) {
                  await supabase
                    .from('trading_orders')
                    .update({ status: 'FAILED' })
                    .eq('id', intent.trading_order_id);
                }
                req.log.error(
                  {
                    intentId: intent.id,
                    wid: intent.bitso_withdrawal_id,
                    mxnAmount: intent.mxn_amount,
                  },
                  'sell-pxo-mxn poll: SPEI failed — PXO sits in treasury, manual ops refund required',
                );
                intent = updated;
              }
            }
          }
        } catch (err) {
          // Soft-fail: log and return the current state. The frontend will
          // poll again in a few seconds.
          req.log.warn(
            { err, intentId: intent.id },
            'sell-pxo-mxn poll: Bitso status check failed',
          );
        }
      }

      return reply.send(intent);
    },
  );
};

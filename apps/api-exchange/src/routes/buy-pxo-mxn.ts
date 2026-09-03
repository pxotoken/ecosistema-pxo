import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';
import { getUserByWallet } from '../lib/user-lookup.js';
import { requireCaller } from '../middleware/identity.js';
import { env } from '../config/env.js';

const SUPPORTED_CHAINS = [137, 80002] as const;

interface CreateDepositIntentBody {
  amountMxn?: number;
  userAddress?: string;
  chainId?: number;
}

/**
 * Fiat on-ramp — SPEI model (replaces the retired Conekta flow).
 *
 * Flow:
 *   1) User pre-registers their bank CLABE in settings (see api-users PATCH /me).
 *   2) POST /buy-pxo-mxn       — creates a deposit_intent. Returns destination
 *                                Bitso CLABE + amount + numeric_reference +
 *                                expires_at for the user to include in the SPEI.
 *   3) (user goes to their bank and sends the SPEI from their registered CLABE)
 *   4) A background worker polls Bitso fundings, matches sender_clabe → user
 *      → open intent, and issues PXO from treasury to the user's wallet.
 *   5) GET /buy-pxo-mxn/:id    — frontend polling for status.
 *
 * PXO is pegged 1:1 to MXN so no Binance pricing lookup is needed.
 */
export const buyPxoMxnRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: CreateDepositIntentBody }>(
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

      const sourceClabe = user.CLABE;
      if (!sourceClabe || !/^\d{18}$/.test(sourceClabe)) {
        return reply.code(400).send({
          error: 'CLABE_NOT_REGISTERED',
          message:
            'Debes registrar tu CLABE bancaria en Configuración antes de depositar por SPEI.',
        });
      }

      if (!env.BITSO_BUSINESS_CLABE || !/^\d{18}$/.test(env.BITSO_BUSINESS_CLABE)) {
        req.log.error('buy-pxo-mxn: BITSO_BUSINESS_CLABE not configured');
        return reply.code(500).send({ error: 'Server not configured for SPEI deposits' });
      }

      const { amountMxn, userAddress, chainId } = req.body ?? {};
      if (!amountMxn || amountMxn <= 0 || !userAddress || !chainId) {
        return reply.code(400).send({ error: 'Missing or invalid required fields' });
      }
      if (!SUPPORTED_CHAINS.includes(chainId as (typeof SUPPORTED_CHAINS)[number])) {
        return reply.code(400).send({ error: `Unsupported chain ID: ${chainId}` });
      }

      const pxoAmount = amountMxn; // 1:1 peg

      // 7-digit numeric reference — the user is asked to include this in their
      // SPEI so a human operator (or a future matcher pass) can disambiguate
      // if a single user has multiple pending intents.
      const numericReference = String(Math.floor(1_000_000 + Math.random() * 9_000_000));

      const expiresAt = new Date(
        Date.now() + env.DEPOSIT_INTENT_TTL_HOURS * 60 * 60 * 1000,
      ).toISOString();

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
          payment_method: 'spei_deposit',
          external_ref: numericReference,
        })
        .select()
        .single();

      if (orderError) {
        req.log.error({ err: orderError }, 'buy-pxo-mxn: create trading_order failed');
        return reply.code(500).send({ error: 'Failed to create order' });
      }

      const { data: intent, error: intentError } = await supabase
        .from('deposit_intents')
        .insert({
          user_id: user.id,
          mxn_amount: amountMxn,
          pxo_amount: pxoAmount,
          destination_clabe: env.BITSO_BUSINESS_CLABE,
          source_clabe: sourceClabe,
          chain_id: chainId,
          user_address: userAddress,
          numeric_reference: numericReference,
          status: 'PENDING',
          trading_order_id: order.id,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (intentError) {
        req.log.error({ err: intentError }, 'buy-pxo-mxn: create intent failed');
        await supabase.from('trading_orders').update({ status: 'FAILED' }).eq('id', order.id);
        return reply.code(500).send({ error: 'Failed to create deposit intent' });
      }

      return reply.send({
        success: true,
        intentId: intent.id,
        tradingOrderId: order.id,
        destinationClabe: env.BITSO_BUSINESS_CLABE,
        beneficiaryName: env.BITSO_BUSINESS_BENEFICIARY_NAME,
        amountMxn,
        pxoAmount,
        numericReference,
        sourceClabe,
        expiresAt,
        chainId,
        status: intent.status,
        message:
          'Envía una transferencia SPEI por el monto exacto desde tu CLABE registrada. Al confirmarse el depósito recibirás el PXO en tu wallet.',
      });
    },
  );

  /**
   * Polling endpoint for the frontend while awaiting SPEI arrival.
   */
  app.get<{ Params: { id: string } }>(
    '/buy-pxo-mxn/:id',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const caller = req.caller!;
      const user = await getUserByWallet(caller.walletAddress);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });

      const { data: intent, error } = await supabase
        .from('deposit_intents')
        .select(
          'id, status, mxn_amount, pxo_amount, destination_clabe, source_clabe, numeric_reference, chain_id, bitso_funding_id, pxo_tx_hash, failure_reason, expires_at, created_at, updated_at',
        )
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        req.log.error({ err: error }, 'buy-pxo-mxn status: select failed');
        return reply.code(500).send({ error: 'Failed to read intent' });
      }
      if (!intent) return reply.code(404).send({ error: 'Intent not found' });

      return reply.send({
        id: intent.id,
        status: intent.status,
        amountMxn: intent.mxn_amount,
        pxoAmount: intent.pxo_amount,
        destinationClabe: intent.destination_clabe,
        sourceClabe: intent.source_clabe,
        numericReference: intent.numeric_reference,
        chainId: intent.chain_id,
        bitsoFundingId: intent.bitso_funding_id,
        pxoTransactionHash: intent.pxo_tx_hash,
        failureReason: intent.failure_reason,
        expiresAt: intent.expires_at,
        createdAt: intent.created_at,
        updatedAt: intent.updated_at,
      });
    },
  );
};

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireCaller } from '../../middleware/identity.js';
import { env } from '../../config/env.js';
import {
  bitsoCreateMockSpeiDeposit,
  bitsoGetFundings,
  extractSenderClabe,
} from '../../lib/bitso.js';

interface MockDepositBody {
  amountMxn?: number;
  receiverName?: string;
}

/**
 * QA-only route: trigger a simulated SPEI deposit via Bitso's stage
 * `/spei/test/deposits` endpoint. Registered by index.ts only when
 * env.MOCK_DEPOSITS_ENABLED is true.
 *
 * The route also does a best-effort follow-up call to `/fundings/` to
 * surface the sender CLABE Bitso assigned to the deposit — that value is
 * what the matching worker uses to tie a funding to a registered user.
 * If it can't be located within a short window, the response includes the
 * tracking code so QA can look it up manually.
 */
export const qaMockDepositRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: MockDepositBody }>(
    '/qa/mock-bitso-deposit',
    { preHandler: requireCaller },
    async (req, reply) => {
      if (!env.BITSO_BUSINESS_CLABE || !/^\d{18}$/.test(env.BITSO_BUSINESS_CLABE)) {
        return reply.code(500).send({
          error: 'BITSO_BUSINESS_CLABE not configured or malformed',
        });
      }

      const { amountMxn, receiverName } = req.body ?? {};
      if (!amountMxn || amountMxn <= 0) {
        return reply.code(400).send({ error: 'amountMxn must be a positive number' });
      }
      const finalReceiverName =
        receiverName?.trim() || env.BITSO_BUSINESS_BENEFICIARY_NAME || 'PXO Treasury MX';

      let deposit;
      try {
        deposit = await bitsoCreateMockSpeiDeposit({
          amountMxn,
          receiverClabe: env.BITSO_BUSINESS_CLABE,
          receiverName: finalReceiverName,
        });
      } catch (err) {
        req.log.error({ err }, 'qa mock-deposit: Bitso call failed');
        return reply.code(502).send({
          error: 'Bitso mock deposit failed',
          details: err instanceof Error ? err.message : String(err),
        });
      }

      // Best-effort: fetch recent fundings and find the one whose
      // tracking_code matches (Bitso populates this on the funding record).
      // Sender CLABE lives in details — we surface it so QA can register a
      // user with that CLABE for a downstream matching-worker test.
      let matchedSenderClabe: string | null = null;
      let matchedFundingId: string | null = null;
      try {
        const fundings = await bitsoGetFundings({ limit: 25 });
        const match = fundings.find((f) => {
          const d = (f.details ?? {}) as Record<string, unknown>;
          return (
            d.tracking_code === deposit.tracking_code ||
            d.tracking_key === deposit.tracking_code
          );
        });
        if (match) {
          matchedFundingId = match.fid;
          matchedSenderClabe = extractSenderClabe(match);
        }
      } catch (err) {
        req.log.warn({ err }, 'qa mock-deposit: funding lookup failed (non-fatal)');
      }

      return reply.send({
        success: true,
        deposit,
        matching: {
          fundingId: matchedFundingId,
          senderClabe: matchedSenderClabe,
          note: matchedSenderClabe
            ? 'Register a user with this CLABE to test the matching worker end-to-end.'
            : 'Sender CLABE not yet visible in /fundings/. Retry in a few seconds or check worker logs.',
        },
      });
    },
  );
};

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MerchantService, MerchantAuthContext } from '../services/MerchantService.js';

declare module 'fastify' {
  interface FastifyRequest {
    merchantAuth?: MerchantAuthContext;
  }
}

const CODE_TO_STATUS: Record<string, number> = {
  INVALID_MERCHANT: 400,
  INVALID_API_KEY: 401,
  MERCHANT_SUSPENDED: 403,
  KYB_REQUIRED: 403,
  INVALID_POS: 400,
};

/**
 * Factory that returns a Fastify preHandler. Validates:
 *   - Authorization: Bearer <apiKey>
 *   - X-POS-ID header
 *   - merchantId in the request body
 * On success, attaches the auth context to `req.merchantAuth`.
 */
export function authenticateApiKey(merchantService: MerchantService) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const auth = req.headers.authorization;
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return reply.code(401).send({ error: 'Missing API key', code: 'INVALID_API_KEY' });
    }
    const apiKey = auth.slice('bearer '.length).trim();
    if (!apiKey) {
      return reply.code(401).send({ error: 'Missing API key', code: 'INVALID_API_KEY' });
    }

    const posId = req.headers['x-pos-id'];
    if (typeof posId !== 'string' || !posId) {
      return reply.code(400).send({ error: 'Missing X-POS-ID header', code: 'INVALID_POS' });
    }

    const merchantId = (req.body as { merchantId?: unknown } | undefined)?.merchantId;
    if (typeof merchantId !== 'string' || !merchantId) {
      return reply
        .code(400)
        .send({ error: 'Missing merchantId in body', code: 'INVALID_MERCHANT' });
    }

    const result = await merchantService.authenticate({ apiKey, merchantId, posId });
    if (!result.ok) {
      const status = CODE_TO_STATUS[result.code] ?? 401;
      return reply.code(status).send({ error: result.code, code: result.code });
    }

    req.merchantAuth = result.context;
  };
}

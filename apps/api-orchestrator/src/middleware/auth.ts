import type { FastifyReply, FastifyRequest } from 'fastify';
import { thirdwebAuth } from '../lib/thirdweb-auth.js';
import { parseCookies } from '../lib/cookies.js';

export interface VerifiedIdentity {
  walletAddress: string;
  chainId?: number | string;
  raw: unknown;
}

declare module 'fastify' {
  interface FastifyRequest {
    identity?: VerifiedIdentity;
  }
}

/**
 * Extract JWT from Authorization header or pxo_jwt cookie.
 */
function extractJwt(req: FastifyRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice('Bearer '.length);
  const cookies = parseCookies(req.headers.cookie);
  return cookies.pxo_jwt ?? null;
}

/**
 * Strict: 401 if no/invalid JWT. Attaches req.identity. Intended as preHandler.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const jwt = extractJwt(req);
  if (!jwt) {
    reply.code(401).send({ error: 'Missing JWT' });
    return;
  }
  let result: Awaited<ReturnType<typeof thirdwebAuth.verifyJWT>>;
  try {
    result = await thirdwebAuth.verifyJWT({ jwt });
  } catch {
    reply.code(401).send({ error: 'Invalid JWT' });
    return;
  }
  if (!result.valid) {
    reply.code(401).send({ error: 'Invalid JWT' });
    return;
  }
  const parsed = result.parsedJWT as { sub?: string; ctx?: { chain_id?: number | string } };
  req.identity = {
    walletAddress: parsed.sub ?? '',
    chainId: parsed.ctx?.chain_id,
    raw: result.parsedJWT,
  };
}

/**
 * Soft: if JWT is present and valid, attach req.identity. Otherwise, pass through.
 */
export async function optionalAuth(req: FastifyRequest): Promise<void> {
  const jwt = extractJwt(req);
  if (!jwt) return;
  try {
    const result = await thirdwebAuth.verifyJWT({ jwt });
    if (!result.valid) return;
    const parsed = result.parsedJWT as { sub?: string; ctx?: { chain_id?: number | string } };
    req.identity = {
      walletAddress: parsed.sub ?? '',
      chainId: parsed.ctx?.chain_id,
      raw: result.parsedJWT,
    };
  } catch {
    // ignore — treat as anonymous
  }
}

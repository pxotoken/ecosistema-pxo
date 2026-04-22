import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

export interface CallerIdentity {
  walletAddress: string;
  isAdmin: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    caller?: CallerIdentity;
  }
}

export async function requireCaller(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const wallet = req.headers['x-pxo-wallet-address'];
  if (typeof wallet !== 'string' || wallet.length === 0) {
    reply.code(401).send({ error: 'Missing caller identity' });
    return;
  }
  const normalized = wallet.toLowerCase();
  req.caller = {
    walletAddress: wallet,
    isAdmin: env.KYC_ADMIN_WALLETS.includes(normalized),
  };
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireCaller(req, reply);
  if (reply.sent) return;
  if (!req.caller?.isAdmin) {
    reply.code(403).send({ error: 'Admin access required' });
  }
}

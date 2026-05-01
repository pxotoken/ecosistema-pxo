import type { FastifyReply, FastifyRequest } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';

const ADMIN_UUID = '989e3702-b515-4d6e-8627-fa0142a1a88f';
const ADMIN_EMAIL = 'admin@pxo.com';

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

  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('users')
    .select('user_type, mail')
    .eq('wallet_address', wallet)
    .single();

  const isAdmin =
    (typeof data?.user_type === 'string' && data.user_type.includes(ADMIN_UUID)) ||
    (Array.isArray(data?.user_type) && data.user_type.some((t: string) => t.includes(ADMIN_UUID))) ||
    data?.mail === ADMIN_EMAIL;

  req.caller = { walletAddress: wallet, isAdmin };
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireCaller(req, reply);
  if (reply.sent) return;
  if (!req.caller?.isAdmin) {
    reply.code(403).send({ error: 'Admin access required' });
  }
}

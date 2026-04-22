import type { FastifyReply, FastifyRequest } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';

const ADMIN_UUID = '989e3702-b515-4d6e-8627-fa0142a1a88f';
const ADMIN_EMAIL = 'admin@pxo.com';

/**
 * Caller has already been verified by the orchestrator (`x-pxo-wallet-address` is trusted).
 * We still need to gate admin routes: look the user up by wallet and confirm role.
 */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const wallet = req.headers['x-pxo-wallet-address'];
  if (typeof wallet !== 'string' || wallet.length === 0) {
    reply.code(401).send({ error: 'Missing caller identity' });
    return;
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, mail, user_type')
    .eq('wallet_address', wallet)
    .single();

  if (error || !data) {
    reply.code(401).send({ error: 'User not found' });
    return;
  }

  const userType = typeof data.user_type === 'string' ? data.user_type : '';
  const isAdmin = userType.includes(ADMIN_UUID) || data.mail === ADMIN_EMAIL;
  if (!isAdmin) {
    reply.code(403).send({ error: 'Forbidden: Admin access required' });
    return;
  }

  req.caller = { walletAddress: wallet };
}

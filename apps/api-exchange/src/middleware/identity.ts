import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Trust the identity header injected by api-orchestrator (`x-pxo-wallet-address`).
 * api-exchange is internal: it never accepts traffic that did not pass through the gateway.
 */
export async function requireCaller(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const wallet = req.headers['x-pxo-wallet-address'];
  if (typeof wallet !== 'string' || wallet.length === 0) {
    reply.code(401).send({ error: 'Missing caller identity' });
    return;
  }
  req.caller = { walletAddress: wallet };
}

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerLiquidity } from '../lib/liquidity.js';

interface LiquidityQuery {
  chainId?: string;
}

export const liquidityRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get<{ Querystring: LiquidityQuery }>('/liquidity', async (req, reply) => {
    try {
      const { chainId } = req.query;
      const parsedChainId = chainId ? Number(chainId) : undefined;

      const liquidity = await getServerLiquidity(
        Number.isFinite(parsedChainId) ? parsedChainId : undefined,
      );

      return reply.send({ success: true, liquidity });
    } catch (error) {
      req.log.error({ err: error }, 'Error in liquidity handler');
      return reply.code(500).send({
        error: 'Failed to fetch liquidity',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

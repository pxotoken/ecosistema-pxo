import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';

export const tokensRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/tokens', async (req, reply) => {
    try {
      const supabase = getServerSupabase();
      const { data: tokens, error } = await supabase
        .from('tokens')
        .select('*')
        .order('symbol');

      if (error) {
        req.log.error({ err: error }, 'Error fetching tokens');
        return reply.code(500).send({ error: 'Failed to fetch tokens' });
      }

      return reply.send({ success: true, tokens: tokens ?? [] });
    } catch (error) {
      req.log.error({ err: error }, 'Error in tokens handler');
      return reply.code(500).send({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

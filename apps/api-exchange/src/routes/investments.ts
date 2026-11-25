import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../lib/supabase.js';
import { requireCaller } from '../middleware/identity.js';

/**
 * The investments catalogue.
 *
 * One row per product the Investments screen offers. The fixed-term
 * certificate (`/cd/*`) is the first; its endpoints stay where they are
 * because they are specific to that product, while this catalogue is not.
 *
 * `apy_percent` here is the headline figure on the card. The rate a
 * certificate actually locks in is the one on the maturity term the user
 * picks — see migration 006 for why the two are not yet reconciled.
 */
export const investmentsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/investments/types', { preHandler: requireCaller }, async (req, reply) => {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('investment_types')
      .select('id, name, display_name, apy_percent')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      req.log.error({ err: error }, 'investments/types: list failed');
      return reply.code(500).send({ error: 'Failed to load investment types' });
    }
    return reply.send({ success: true, data: data ?? [] });
  });

  // Resolve one product by its slug — the URL segment the product screen is
  // opened with. A separate endpoint rather than filtering the list client
  // side, so an unknown slug is a 404 instead of a blank screen.
  app.get<{ Params: { name: string } }>(
    '/investments/types/:name',
    { preHandler: requireCaller },
    async (req, reply) => {
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('investment_types')
        .select('id, name, display_name, apy_percent')
        .eq('name', req.params.name)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        req.log.error({ err: error }, 'investments/types/:name: lookup failed');
        return reply.code(500).send({ error: 'Failed to load the investment type' });
      }
      if (!data) return reply.code(404).send({ error: 'Investment type not found' });
      return reply.send({ success: true, data });
    },
  );
};

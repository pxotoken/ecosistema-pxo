import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../middleware/admin.js';
import { MAX_PRICING_SPREAD } from '@pxo/shared/consts';

/** Reject a spread that is negative or implausibly large (see MAX_PRICING_SPREAD). */
const spreadError = (field: string, value: number): string | null => {
  if (!Number.isFinite(value)) return `${field} must be a number`;
  if (value < 0) return `${field} must be non-negative`;
  if (value > MAX_PRICING_SPREAD) {
    return `${field} must be at most ${MAX_PRICING_SPREAD} (${MAX_PRICING_SPREAD * 100}%). Spreads are fractions, so 0.03 is 3%.`;
  }
  return null;
};

interface GetQuery {
  pair?: string;
}

interface CreateBody {
  pair: string;
  spread_buy: number;
  spread_sell: number;
}

interface UpdateBody {
  id: string;
  pair?: string;
  spread_buy?: number;
  spread_sell?: number;
}

interface DeleteQuery {
  id?: string;
}

export const pricingRulesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAdmin);

  app.get<{ Querystring: GetQuery }>('/pricing-rules', async (req, reply) => {
    try {
      const supabase = getServerSupabase();
      const { pair } = req.query;

      let query = supabase.from('pricing_rules').select('*').order('pair');
      if (pair) query = query.eq('pair', pair);

      const { data, error } = await query;
      if (error) {
        req.log.error({ err: error }, 'Error fetching pricing rules');
        return reply.code(500).send({ error: 'Failed to fetch pricing rules' });
      }

      return reply.send({
        success: true,
        data: data ?? [],
        count: data?.length ?? 0,
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error in GET pricing-rules');
      return reply.code(500).send({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post<{ Body: CreateBody }>('/pricing-rules', async (req, reply) => {
    try {
      const supabase = getServerSupabase();
      const { pair, spread_buy, spread_sell } = req.body ?? ({} as CreateBody);

      if (!pair || spread_buy === undefined || spread_sell === undefined) {
        return reply.code(400).send({
          error: 'Missing required fields: pair, spread_buy, spread_sell',
        });
      }

      const createError = spreadError('spread_buy', spread_buy) ?? spreadError('spread_sell', spread_sell);
      if (createError) {
        return reply.code(400).send({ error: createError });
      }

      const { data, error } = await supabase
        .from('pricing_rules')
        .insert({
          pair: pair.toUpperCase(),
          spread_buy,
          spread_sell,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        req.log.error({ err: error }, 'Error creating pricing rule');
        return reply.code(500).send({ error: 'Failed to create pricing rule' });
      }

      return reply.code(201).send({
        success: true,
        data,
        message: 'Pricing rule created successfully',
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error in POST pricing-rules');
      return reply.code(500).send({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.put<{ Body: UpdateBody }>('/pricing-rules', async (req, reply) => {
    try {
      const supabase = getServerSupabase();
      const { id, pair, spread_buy, spread_sell } = req.body ?? ({} as UpdateBody);

      if (!id) {
        return reply.code(400).send({ error: 'Missing required field: id' });
      }

      const updateData: Record<string, unknown> = {};
      if (pair !== undefined) updateData.pair = pair.toUpperCase();
      if (spread_buy !== undefined) {
        const err = spreadError('spread_buy', spread_buy);
        if (err) return reply.code(400).send({ error: err });
        updateData.spread_buy = spread_buy;
      }
      if (spread_sell !== undefined) {
        const err = spreadError('spread_sell', spread_sell);
        if (err) return reply.code(400).send({ error: err });
        updateData.spread_sell = spread_sell;
      }
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('pricing_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        req.log.error({ err: error }, 'Error updating pricing rule');
        return reply.code(500).send({ error: 'Failed to update pricing rule' });
      }

      if (!data) {
        return reply.code(404).send({ error: 'Pricing rule not found' });
      }

      return reply.send({
        success: true,
        data,
        message: 'Pricing rule updated successfully',
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error in PUT pricing-rules');
      return reply.code(500).send({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.delete<{ Querystring: DeleteQuery }>('/pricing-rules', async (req, reply) => {
    try {
      const supabase = getServerSupabase();
      const { id } = req.query;

      if (!id) {
        return reply.code(400).send({ error: 'Missing required parameter: id' });
      }

      const { error } = await supabase.from('pricing_rules').delete().eq('id', id);

      if (error) {
        req.log.error({ err: error }, 'Error deleting pricing rule');
        return reply.code(500).send({ error: 'Failed to delete pricing rule' });
      }

      return reply.send({
        success: true,
        message: 'Pricing rule deleted successfully',
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error in DELETE pricing-rules');
      return reply.code(500).send({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

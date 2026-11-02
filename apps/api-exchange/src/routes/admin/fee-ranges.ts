import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getServerSupabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../middleware/admin.js';

/**
 * Fee-by-range admin CRUD.
 *
 * This is a data-entry surface for stakeholders to record scenarios — "10% off
 * the exchange fee for buys between 1M and 5M PXO" — so they can be simulated
 * and argued about. **Nothing applies these percentages to a transaction**, and
 * no route here is read by the pricing path. See migration 004 for the
 * semantics that are deliberately still open.
 */

interface GetQuery {
  concept?: string;
}

interface CreateBody {
  concept: string;
  /** Token symbol the band is counted in: PXO, MXN, USD, USDC, USDT. */
  denomination: string;
  amount_from: number;
  amount_to: number;
  percent: number;
}

interface UpdateBody extends Partial<CreateBody> {
  id: string;
}

interface DeleteQuery {
  id?: string;
}

/** Mirrors the CHECK constraints in migration 004 — alphanumeric, 1-64 chars. */
const CONCEPT_RE = /^[A-Za-z0-9]{1,64}$/;
/** Shape of a token symbol. Not an allowlist — see migration 004. */
const DENOM_RE = /^[A-Za-z0-9]{1,16}$/;

/**
 * Validate the money-shaped fields. Returns a message, or null when fine.
 * The table enforces the same rules; this exists so the caller gets a sentence
 * rather than a Postgres constraint name.
 */
function validateFields(b: Partial<CreateBody>, requireAll: boolean): string | null {
  if (requireAll || b.concept !== undefined) {
    if (typeof b.concept !== 'string' || !CONCEPT_RE.test(b.concept)) {
      return 'concept must be 1-64 letters and digits only (no spaces or punctuation)';
    }
  }
  if (requireAll || b.denomination !== undefined) {
    if (typeof b.denomination !== 'string' || !DENOM_RE.test(b.denomination)) {
      return 'denomination must be a token symbol, e.g. PXO, MXN, USD';
    }
  }
  for (const key of ['amount_from', 'amount_to', 'percent'] as const) {
    const v = b[key];
    if (v === undefined) {
      if (requireAll) return `Missing required field: ${key}`;
      continue;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) return `${key} must be a number`;
    if (v < 0) return `${key} must not be negative`;
  }
  if (b.percent !== undefined && b.percent > 100) return 'percent must be between 0 and 100';
  // Only checkable when both bounds are in play; on a partial update the
  // database constraint is the backstop.
  if (b.amount_from !== undefined && b.amount_to !== undefined && b.amount_to <= b.amount_from) {
    return 'amount_to must be greater than amount_from';
  }
  return null;
}

export const feeRangesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAdmin);

  app.get<{ Querystring: GetQuery }>('/fee-ranges', async (req, reply) => {
    try {
      const supabase = getServerSupabase();
      let query = supabase
        .from('fee_ranges')
        .select('*')
        .order('concept')
        .order('amount_from');

      if (req.query.concept) query = query.eq('concept', req.query.concept);

      const { data, error } = await query;
      if (error) {
        req.log.error({ err: error }, 'fee-ranges: list failed');
        return reply.code(500).send({ error: 'Failed to list fee ranges' });
      }
      return reply.send({ success: true, data });
    } catch (err) {
      req.log.error({ err }, 'fee-ranges: list threw');
      return reply.code(500).send({ error: 'Failed to list fee ranges' });
    }
  });

  app.post<{ Body: CreateBody }>('/fee-ranges', async (req, reply) => {
    try {
      const body = req.body ?? ({} as CreateBody);
      const invalid = validateFields(body, true);
      if (invalid) return reply.code(400).send({ error: invalid });

      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('fee_ranges')
        .insert({
          concept: body.concept,
          denomination: body.denomination,
          amount_from: body.amount_from,
          amount_to: body.amount_to,
          percent: body.percent,
        })
        .select()
        .single();

      if (error) {
        req.log.error({ err: error }, 'fee-ranges: create failed');
        return reply.code(500).send({ error: 'Failed to create fee range' });
      }
      return reply.code(201).send({ success: true, data });
    } catch (err) {
      req.log.error({ err }, 'fee-ranges: create threw');
      return reply.code(500).send({ error: 'Failed to create fee range' });
    }
  });

  app.put<{ Body: UpdateBody }>('/fee-ranges', async (req, reply) => {
    try {
      const { id, ...rest } = req.body ?? ({} as UpdateBody);
      if (!id) return reply.code(400).send({ error: 'Missing required field: id' });

      const invalid = validateFields(rest, false);
      if (invalid) return reply.code(400).send({ error: invalid });

      const updateData: Record<string, unknown> = {};
      for (const key of ['concept', 'denomination', 'amount_from', 'amount_to', 'percent'] as const) {
        if (rest[key] !== undefined) updateData[key] = rest[key];
      }
      if (Object.keys(updateData).length === 0) {
        return reply.code(400).send({ error: 'Nothing to update' });
      }
      // updated_at is maintained by the table's trigger, not set here.

      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('fee_ranges')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        req.log.error({ err: error }, 'fee-ranges: update failed');
        return reply.code(500).send({ error: 'Failed to update fee range' });
      }
      if (!data) return reply.code(404).send({ error: 'Fee range not found' });
      return reply.send({ success: true, data });
    } catch (err) {
      req.log.error({ err }, 'fee-ranges: update threw');
      return reply.code(500).send({ error: 'Failed to update fee range' });
    }
  });

  app.delete<{ Querystring: DeleteQuery }>('/fee-ranges', async (req, reply) => {
    try {
      const { id } = req.query;
      if (!id) return reply.code(400).send({ error: 'Missing required parameter: id' });

      const supabase = getServerSupabase();
      const { error } = await supabase.from('fee_ranges').delete().eq('id', id);
      if (error) {
        req.log.error({ err: error }, 'fee-ranges: delete failed');
        return reply.code(500).send({ error: 'Failed to delete fee range' });
      }
      return reply.send({ success: true });
    } catch (err) {
      req.log.error({ err }, 'fee-ranges: delete threw');
      return reply.code(500).send({ error: 'Failed to delete fee range' });
    }
  });
};

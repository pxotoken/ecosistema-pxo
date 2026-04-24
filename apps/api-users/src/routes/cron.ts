import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Keep-alive cron (moved from legacy apps/api/api/cron/supabase-keepalive.ts).
 * Guarded with CRON_SECRET; accepts either `x-cron-secret` header or
 * `Authorization: Bearer <secret>`. Runs a lightweight COUNT on `api_logs` to
 * keep the Supabase project active.
 */
export function cronRoutes(supabase: SupabaseClient): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.get('/supabase-keepalive', async (req, reply) => {
      const expected = env.CRON_SECRET;
      if (!expected) {
        return reply.code(500).send({
          success: false,
          error: 'CRON_SECRET not configured',
          timestamp: new Date().toISOString(),
        });
      }

      const headerSecret = req.headers['x-cron-secret'];
      const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const provided = typeof headerSecret === 'string' ? headerSecret : bearer;

      if (!provided) {
        return reply.code(401).send({
          success: false,
          error: 'Missing authentication token. Provide x-cron-secret header or Bearer token',
          timestamp: new Date().toISOString(),
        });
      }
      if (provided !== expected) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        });
      }

      const start = Date.now();
      try {
        const { count, error } = await supabase
          .from('api_logs')
          .select('id', { count: 'exact', head: true })
          .limit(1);

        if (error) throw new Error(`Keep-alive query failed: ${error.message}`);

        const duration = Date.now() - start;
        return reply.send({
          success: true,
          message: 'Keep-alive ping successful',
          data: {
            recordCount: count,
            queryDuration: `${duration}ms`,
            totalDuration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        const duration = Date.now() - start;
        req.log.error({ err }, 'supabase-keepalive failed');
        return reply.code(500).send({
          success: false,
          error: err instanceof Error ? err.message : 'Internal server error',
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      }
    });
  };
}

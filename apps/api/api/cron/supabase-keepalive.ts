/**
 * Supabase Keep-Alive Cron Job
 * Endpoint: /api/cron/supabase-keepalive
 * Security: Protected with CRON_SECRET header
 * Frequency: Every 12 hours
 * Action: SELECT COUNT(*) from api_logs (read-only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateCronAuth } from '../../lib/helpers/cronAuth.js';
import { performKeepAlive, createLog } from '../../lib/repositories/ApiLogRepository.js';
import { HTTP_STATUS, HTTP_METHODS, API_PROVIDERS, CRON_ENDPOINTS } from '@pxo/shared/consts';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();

  try {
    // 1. Validate cron authentication
    const authResult = validateCronAuth(req);

    if (!authResult.isValid) {
      const isConfigError = authResult.error?.includes('not configured');
      console.error(`[Supabase-KeepAlive] ${authResult.error}`);

      return res.status(isConfigError ? HTTP_STATUS.INTERNAL_SERVER_ERROR : HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString(),
      });
    }

    const { recordCount, duration } = await performKeepAlive();
    const totalDuration = Date.now() - startTime;

    await createLog({
      provider: API_PROVIDERS.SUPABASE_KEEPALIVE,
      method: HTTP_METHODS.GET,
      endpoint: CRON_ENDPOINTS.SUPABASE_KEEPALIVE,
      status: HTTP_STATUS.OK,
      response: {
        message: 'Keep-alive ping successful',
        recordCount,
        queryDuration: `${duration}ms`,
        totalDuration: `${totalDuration}ms`,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[Supabase-KeepAlive] ✓ Successful execution - ${duration}ms - ${recordCount} records`);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Keep-alive ping successful',
      data: {
        recordCount,
        queryDuration: `${duration}ms`,
        totalDuration: `${totalDuration}ms`,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;

    console.error('[Supabase-KeepAlive] ✗ Error:', error);

    try {
      await createLog({
        provider: API_PROVIDERS.SUPABASE_KEEPALIVE,
        method: HTTP_METHODS.GET,
        endpoint: CRON_ENDPOINTS.SUPABASE_KEEPALIVE,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        response: {
          error: error.message || 'Unknown error',
          duration: `${totalDuration}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.error('[Supabase-KeepAlive] Failed to log error:', logError);
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || 'Internal server error',
      duration: `${totalDuration}ms`,
      timestamp: new Date().toISOString(),
    });
  }
}

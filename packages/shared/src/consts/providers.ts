/**
 * External API Providers
 * Constants for all external services
 */

export const API_PROVIDERS = {
  BINANCE: 'BINANCE',
  SUPABASE_KEEPALIVE: 'SUPABASE_KEEPALIVE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ApiProvider = typeof API_PROVIDERS[keyof typeof API_PROVIDERS];

/**
 * Cron Job Endpoints
 * Constants for cron job endpoints
 */
export const CRON_ENDPOINTS = {
  SUPABASE_KEEPALIVE: '/api/cron/supabase-keepalive',
} as const;

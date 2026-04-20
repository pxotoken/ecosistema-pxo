/**
 * Cron Authentication Helper
 * Validates cron job authentication tokens
 */

import type { VercelRequest } from '@vercel/node';

export interface CronAuthResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates cron job request authentication
 * Requires CRON_SECRET for all requests
 * 
 * @param req - Vercel request object
 * @returns Validation result with error message if invalid
 */
export function validateCronAuth(req: VercelRequest): CronAuthResult {
  // 1. Check if CRON_SECRET is configured
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return {
      isValid: false,
      error: 'CRON_SECRET not configured in environment variables',
    };
  }

  // 2. Extract token from headers
  const cronSecret =
    req.headers['x-cron-secret'] ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!cronSecret) {
    return {
      isValid: false,
      error: 'Missing authentication token. Provide x-cron-secret header or Bearer token',
    };
  }

  // 3. Validate token
  if (cronSecret !== expectedSecret) {
    return {
      isValid: false,
      error: 'Invalid authentication token',
    };
  }

  return { isValid: true };
}

/**
 * Checks if CRON_SECRET environment variable is configured
 * @returns true if configured, false otherwise
 */
export function isCronSecretConfigured(): boolean {
  return !!process.env.CRON_SECRET;
}

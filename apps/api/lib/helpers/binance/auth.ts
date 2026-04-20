/**
 * Binance Authentication
 * HMAC SHA256 signature functions for Binance API authentication
 */

import crypto from 'crypto';
import { BINANCE_HEADERS } from '@pxo/shared/consts/security';

/**
 * Sign a query string with HMAC SHA256
 * @param queryString - String to sign (e.g., "symbol=BTCUSDT&timestamp=1700352000000")
 * @param secretKey - Binance secret key
 * @returns Signature in hexadecimal format
 */
export function signRequest(queryString: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

/**
 * Create authenticated parameters for Binance API
 * Automatically adds timestamp and signature
 * @param params - Request parameters
 * @param secretKey - Binance secret key
 * @returns Parameters with timestamp and signature
 */
export function createAuthParams(
  params: Record<string, any>,
  secretKey: string
): Record<string, any> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
  );

  const timestamp = Date.now();
  const paramsWithTimestamp = { ...cleanParams, timestamp };

  const queryString = Object.entries(paramsWithTimestamp)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signature = signRequest(queryString, secretKey);

  return {
    ...paramsWithTimestamp,
    signature,
  };
}

/**
 * Applies Binance authentication to request config
 * @param config - Axios request config
 * @returns Updated config with auth params and headers
 */
export function applyBinanceAuth(
  config: any
): any {
  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('BINANCE_API_KEY and BINANCE_SECRET_KEY must be set');
  }

  config.params = createAuthParams(config.params || {}, secretKey);
  config.headers[BINANCE_HEADERS.API_KEY] = apiKey;

  return config;
}

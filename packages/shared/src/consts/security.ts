/**
 * Security Constants
 * Sensitive data keys to redact from logs
 */

export const SENSITIVE_KEYS = [
  'apikey',
  'api_key',
  'authorization',
  'password',
  'token',
  'secret',
  'secretkey',
  'secret_key',
  'bearer',
  'private_key',
  'privatekey',
  'signature',
  'x-mbx-apikey',
  'timestamp',
] as const;

/**
 * Binance API Headers
 */
export const BINANCE_HEADERS = {
  API_KEY: 'X-MBX-APIKEY',
} as const;

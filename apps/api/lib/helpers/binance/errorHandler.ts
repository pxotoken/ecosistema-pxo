/**
 * Binance Error Handler
 * Centralizes error handling for Binance API responses
 */

import type { VercelResponse } from '@vercel/node';
import { ErrorWithResponse } from '@pxo/shared/types';
import { HTTP_STATUS } from '@pxo/shared/consts/http';

/**
 * Handles Binance API errors and sends appropriate response
 * @param error - The caught error object
 * @param res - Vercel response object
 * @param fallbackMessage - Custom error message for non-Binance errors (default: 'Internal server error')
 */
export function handleBinanceError(
  error: ErrorWithResponse,
  res: VercelResponse,
  fallbackMessage: string = 'Internal server error'
): void {
  const binanceError = error.response?.data;
  const hasBinanceError = binanceError?.code && binanceError?.msg;

  if (hasBinanceError) {
    res.status(error.response?.status || HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: binanceError.msg,
      code: binanceError.code,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: fallbackMessage,
    message: error.message || 'Unknown error',
    timestamp: new Date().toISOString(),
  });
}

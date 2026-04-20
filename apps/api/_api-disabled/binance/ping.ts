/**
 * Binance Ping Test Endpoint
 * This endpoint tests connectivity with the Binance API.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testPing } from '../../lib/services/external/BinanceService.js';
import { HTTP_METHODS, HTTP_STATUS } from '../../lib/consts/http.js';
import { handleBinanceError } from '../../lib/helpers/binance/errorHandler.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === HTTP_METHODS.OPTIONS) {
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  if (req.method !== HTTP_METHODS.GET) {
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const isConnected = await testPing();

    if (isConnected) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { connected: true },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        error: 'Could not connect to Binance API',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    handleBinanceError(error, res, 'Failed to connect to Binance');
  }
}

/**
 * Binance Price Endpoint
 * Get current price for a trading pair
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentPrice } from '../../lib/services/external/BinanceService.js';
import { HTTP_METHODS, HTTP_STATUS } from '../../lib/consts/http.js';
import { handleBinanceError } from '../../lib/helpers/binance/errorHandler.js';
import { validateQuery } from '../../lib/helpers/validateBody.js';
import { getPriceSchema } from '../../lib/schemas/index.js';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    // CORS headers
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
        const params = validateQuery<{ symbol: string }>(getPriceSchema, req, res);
        if (!params) return;

        const priceData = await getCurrentPrice(params.symbol);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: priceData,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        handleBinanceError(error, res);
    }
}

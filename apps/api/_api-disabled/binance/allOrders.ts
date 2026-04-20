/**
 * Binance Orders History Endpoint
 * Get all orders for a symbol (requires authentication)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllOrders } from '../../lib/services/external/BinanceService.js';
import { HTTP_METHODS, HTTP_STATUS } from '../../lib/consts/http.js';
import type { GetAllOrdersRequest } from '../../lib/types/binance.js';
import { validateQuery } from '../../lib/helpers/validateBody.js';
import { getAllOrdersSchema } from '../../lib/schemas/index.js';
import { handleBinanceError } from '../../lib/helpers/binance/errorHandler.js';

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
        const params = validateQuery<GetAllOrdersRequest>(getAllOrdersSchema, req, res);
        if (!params) return;

        const orders = await getAllOrders(params);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                count: orders.length,
                orders,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        handleBinanceError(error, res, 'Failed to fetch orders');
    }
}

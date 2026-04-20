/**
 * Binance Order Endpoint
 * Create buy/sell orders (requires authentication)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOrder } from '../../lib/services/external/BinanceService.js';
import { HTTP_METHODS, HTTP_STATUS } from '../../lib/consts/http.js';
import type { CreateOrderRequest } from '../../lib/types/binance.js';
import { validateBody } from '../../lib/helpers/validateBody.js';
import { createOrderSchema } from '../../lib/schemas/index.js';
import { handleBinanceError } from '../../lib/helpers/binance/errorHandler.js';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === HTTP_METHODS.OPTIONS) {
        res.status(HTTP_STATUS.OK).end();
        return;
    }

    if (req.method !== HTTP_METHODS.POST) {
        res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const orderData = validateBody<CreateOrderRequest>(createOrderSchema, req, res);
        if (!orderData) return;

        const orderResponse = await createOrder(orderData);

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: orderResponse,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        handleBinanceError(error, res);
    }
}

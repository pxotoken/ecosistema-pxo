import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PricingService, BinancePriceProvider } from '../lib/services/pricing/index.js';
import { HTTP_METHODS, HTTP_STATUS } from '@pxo/shared/consts/http';
import { validateQuery } from '@pxo/shared/helpers/validateBody';
import { getPricesSchema } from '@pxo/shared/schemas';

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
    const params = validateQuery<{ pair: string }>(getPricesSchema, req, res);
    if (!params) return;

    const binanceProvider = new BinancePriceProvider();
    const pricingService = new PricingService(binanceProvider);

    const { buy, sell } = await pricingService.getPrices(params.pair);

    res.status(HTTP_STATUS.OK).json({
      buy: buy.price,
      sell: sell.price,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('❌ Error in prices API:', error);

    if (error.message?.includes('Pricing rule not found')) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: error.message,
      });
      return;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch prices',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}


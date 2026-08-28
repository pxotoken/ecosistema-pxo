import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PricingService, createPriceProvider } from '../lib/pricing/index.js';

interface PricesQuery {
  pair?: string;
}

export const pricesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get<{ Querystring: PricesQuery }>('/prices', async (req, reply) => {
    const pair = req.query.pair?.toUpperCase();
    if (!pair) {
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: ['Missing required parameter: pair'],
      });
    }

    try {
      const pricingService = new PricingService(createPriceProvider());
      const { buy, sell } = await pricingService.getPrices(pair);

      return reply.send({
        buy: buy.price,
        sell: sell.price,
        timestamp: Date.now(),
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error in prices handler');
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('Pricing rule not found')) {
        return reply.code(404).send({ error: message });
      }

      return reply.code(500).send({
        error: 'Failed to fetch prices',
        details: message,
      });
    }
  });
};

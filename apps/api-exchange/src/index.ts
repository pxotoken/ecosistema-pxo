import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { tokensRoutes } from './routes/tokens.js';
import { liquidityRoutes } from './routes/liquidity.js';
import { pricesRoutes } from './routes/prices.js';
import { buyPxoRoutes } from './routes/buy-pxo.js';
import { sellPxoRoutes } from './routes/sell-pxo.js';
import { gasSubsidyRoutes } from './routes/gas-subsidy.js';
import { ordersRoutes } from './routes/orders.js';
import { pricingRulesRoutes } from './routes/admin/pricing-rules.js';
import { buyPxoMxnRoutes } from './routes/buy-pxo-mxn.js';
import { sellPxoMxnRoutes } from './routes/sell-pxo-mxn.js';
import { conektaWebhookRoutes } from './routes/webhooks/conekta.js';
import { bitsoWebhookRoutes } from './routes/webhooks/bitso.js';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin:
      env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*'
        ? true
        : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.get('/health', async () => ({ status: 'ok', service: 'api-exchange' }));

  await app.register(tokensRoutes, { prefix: '/api/exchange' });
  await app.register(liquidityRoutes, { prefix: '/api/exchange' });
  await app.register(buyPxoRoutes, { prefix: '/api/exchange' });
  await app.register(sellPxoRoutes, { prefix: '/api/exchange' });
  await app.register(gasSubsidyRoutes, { prefix: '/api/exchange' });
  await app.register(ordersRoutes, { prefix: '/api/exchange' });
  await app.register(pricesRoutes, { prefix: '/api' });
  await app.register(pricingRulesRoutes, { prefix: '/api/admin' });

  // Fiat (MXN) on-ramp + off-ramp via Conekta + Bitso. Webhooks bypass
  // requireCaller and use HMAC signature verification instead.
  await app.register(buyPxoMxnRoutes, { prefix: '/api/exchange' });
  await app.register(sellPxoMxnRoutes, { prefix: '/api/exchange' });
  await app.register(conektaWebhookRoutes, { prefix: '/api/exchange' });
  await app.register(bitsoWebhookRoutes, { prefix: '/api/exchange' });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { tokensRoutes } from './routes/tokens.js';
import { liquidityRoutes } from './routes/liquidity.js';
import { pricesRoutes } from './routes/prices.js';
import { pricingRulesRoutes } from './routes/admin/pricing-rules.js';

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
  await app.register(pricesRoutes, { prefix: '/api' });
  await app.register(pricingRulesRoutes, { prefix: '/api/admin' });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { paymentRoutes } from './routes/payments/index.js';
import { webhookRoutes } from './routes/webhooks/index.js';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  await app.register(paymentRoutes, { prefix: '/v1/payments' });
  await app.register(webhookRoutes, { prefix: '/v1/webhooks' });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { transactionsRoutes } from './routes/transactions.js';
import { adminStatusRoutes } from './routes/admin/status.js';
import { registerGracefulShutdown } from '@pxo/shared/helpers';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'OPTIONS'],
  });

  app.get('/health', async () => ({ status: 'ok', service: 'api-wallet' }));

  await app.register(transactionsRoutes, { prefix: '/api/wallet' });
  await app.register(adminStatusRoutes, { prefix: '/api/wallet/admin' });

  await app.listen({ port: env.PORT, host: env.HOST });

  registerGracefulShutdown(app);
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

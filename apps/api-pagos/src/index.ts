import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { getActiveChain } from './config/chains.js';
import { createServices } from './services/index.js';
import { paymentRoutes } from './routes/payments/index.js';
import { chargeRoutes } from './routes/charges/index.js';
import { webhookRoutes } from './routes/webhooks/index.js';
import { startExpirationWorker } from './jobs/expirationWorker.js';
import { startReconciliationWorker } from './jobs/reconciliation.js';
import { registerGracefulShutdown } from '@pxo/shared/helpers';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin:
      env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*'
        ? true
        : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const services = createServices();
  const chain = getActiveChain();

  app.get('/health', async () => ({
    status: 'ok',
    service: 'api-pagos',
    chain: { id: chain.chainId, name: chain.name },
  }));

  await app.register(paymentRoutes(services), { prefix: '/v1/payments' });
  await app.register(chargeRoutes(services), { prefix: '/v1/charges' });
  await app.register(webhookRoutes(services), { prefix: '/v1/webhooks' });

  const workerLogger = {
    info: (m: string) => app.log.info(m),
    error: (m: string) => app.log.error(m),
  };
  const expirationWorker = startExpirationWorker(
    services.payments,
    env.EXPIRATION_WORKER_INTERVAL_MS,
    workerLogger,
  );
  const reconciliationWorker = startReconciliationWorker(
    services.reconciliation,
    env.RECONCILIATION_WORKER_INTERVAL_MS,
    workerLogger,
  );

  await app.listen({ port: env.PORT, host: env.HOST });

  registerGracefulShutdown(app, {
    onShutdown: [() => expirationWorker.stop(), () => reconciliationWorker.stop()],
  });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

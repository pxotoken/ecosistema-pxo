import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { getServerSupabase } from './lib/supabase.js';
import { KycRepository, UserKycStatusRepository } from './lib/kyc-repository.js';
import { KycStorage } from './lib/kyc-storage.js';
import { kycRoutes } from './routes/kyc.js';
import { registerGracefulShutdown } from '@pxo/shared/helpers';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  });

  const supabase = getServerSupabase();
  const submissions = new KycRepository(supabase);
  const userStatus = new UserKycStatusRepository(supabase);
  const storage = new KycStorage(supabase);

  app.get('/health', async () => ({ status: 'ok', service: 'api-kyc' }));

  await app.register(kycRoutes(submissions, userStatus, storage), { prefix: '/api/kyc' });

  await app.listen({ port: env.PORT, host: env.HOST });

  registerGracefulShutdown(app);
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

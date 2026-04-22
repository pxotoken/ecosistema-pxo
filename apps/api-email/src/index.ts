import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { EmailService } from './lib/email-service.js';
import { UserRepository } from './lib/user-repository.js';
import { getServerSupabase } from './lib/supabase.js';
import { contactRoutes } from './routes/contact.js';
import { broadcastRoutes } from './routes/broadcast.js';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // Broadcast-to-all-users needs DB. Contact doesn't.
  // If Supabase env is missing, /broadcast still works when `emails[]` is provided.
  let users: UserRepository | undefined;
  try {
    users = new UserRepository(getServerSupabase());
  } catch (err) {
    app.log.warn({ err: (err as Error).message }, 'Supabase disabled — /broadcast without emails[] will fail');
  }
  const emailService = new EmailService(users);

  app.get('/health', async () => ({ status: 'ok', service: 'api-email' }));

  await app.register(contactRoutes(emailService), { prefix: '/api/email' });
  await app.register(broadcastRoutes(emailService), { prefix: '/api/email' });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

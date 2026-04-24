import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { getServerSupabase } from './lib/supabase.js';
import { UserRepository } from './lib/user-repository.js';
import { usersRoutes } from './routes/users.js';
import { adminUsersRoutes } from './routes/admin-users.js';
import { cronRoutes } from './routes/cron.js';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  });

  const supabase = getServerSupabase();
  const users = new UserRepository(supabase);

  app.get('/health', async () => ({ status: 'ok', service: 'api-users' }));

  await app.register(cronRoutes(supabase), { prefix: '/api/users/cron' });
  await app.register(adminUsersRoutes(users), { prefix: '/api/users/admin' });
  await app.register(usersRoutes(users), { prefix: '/api/users' });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

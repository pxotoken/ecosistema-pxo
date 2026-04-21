import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { getServerSupabase } from './lib/supabase.js';
import { UserRepository } from './repositories/UserRepository.js';
import { UserService } from './services/UserService.js';
import { loginRoutes } from './routes/login.js';
import { logoutRoutes } from './routes/logout.js';
import { verifyRoutes } from './routes/verify.js';
import { providerRoutes } from './routes/provider.js';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  const supabase = getServerSupabase();
  const userRepository = new UserRepository(supabase);
  const userService = new UserService(userRepository);

  app.get('/health', async () => ({ status: 'ok', service: 'auth' }));

  await app.register(loginRoutes(userService), { prefix: '/api/auth' });
  await app.register(logoutRoutes, { prefix: '/api/auth' });
  await app.register(verifyRoutes(userService), { prefix: '/api/auth' });
  await app.register(providerRoutes(userService), { prefix: '/api/auth' });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

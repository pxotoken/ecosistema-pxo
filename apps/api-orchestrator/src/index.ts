import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import httpProxy from '@fastify/http-proxy';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Health (local — no proxied)
  app.get('/health', async () => ({
    status: 'ok',
    service: 'api-orchestrator',
    upstreams: {
      api_auth: env.UPSTREAM_API_AUTH,
      api_pagos: env.UPSTREAM_API_PAGOS,
      api_legacy: env.UPSTREAM_API_LEGACY,
    },
  }));

  // Demo of JWT verify capability — protected route that echoes the identity.
  app.get('/whoami', { preHandler: requireAuth }, async (req) => ({
    identity: req.identity,
  }));

  // --- Proxies ---
  // Order matters: more specific prefixes register first.

  // /api/auth/* -> api-auth
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_AUTH,
    prefix: '/api/auth',
    rewritePrefix: '/api/auth',
    http2: false,
  });

  // /v1/payments/* -> api-pagos
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_PAGOS,
    prefix: '/v1/payments',
    rewritePrefix: '/v1/payments',
    http2: false,
  });

  // /api/* (catch-all) -> api legacy
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_LEGACY,
    prefix: '/api',
    rewritePrefix: '/api',
    http2: false,
  });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

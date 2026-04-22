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
      api_email: env.UPSTREAM_API_EMAIL,
      api_pagos: env.UPSTREAM_API_PAGOS,
      api_users: env.UPSTREAM_API_USERS,
      api_kyc: env.UPSTREAM_API_KYC,
      api_wallet: env.UPSTREAM_API_WALLET,
      api_legacy: env.UPSTREAM_API_LEGACY,
    },
  }));

  // Inject verified identity into upstream requests so internal APIs can trust
  // `x-pxo-wallet-address` without each re-verifying the JWT.
  const injectIdentity = {
    rewriteRequestHeaders: (originalReq: unknown, headers: Record<string, string | string[] | undefined>) => {
      const identity = (originalReq as { identity?: { walletAddress?: string } }).identity;
      return {
        ...headers,
        'x-pxo-wallet-address': identity?.walletAddress ?? '',
      };
    },
  };

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

  // /api/email/* -> api-email
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EMAIL,
    prefix: '/api/email',
    rewritePrefix: '/api/email',
    http2: false,
  });

  // /api/users/* -> api-users (authenticated, identity propagated)
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_USERS,
    prefix: '/api/users',
    rewritePrefix: '/api/users',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  // /api/kyc/* -> api-kyc (authenticated, identity propagated)
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_KYC,
    prefix: '/api/kyc',
    rewritePrefix: '/api/kyc',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  // /v1/payments/* -> api-pagos
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_PAGOS,
    prefix: '/v1/payments',
    rewritePrefix: '/v1/payments',
    http2: false,
  });

  // /api/wallet/* -> api-wallet (authenticated, identity propagated).
  // Admin sub-routes enforce role inside api-wallet via Supabase lookup.
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_WALLET,
    prefix: '/api/wallet',
    rewritePrefix: '/api/wallet',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
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

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import httpProxy from '@fastify/http-proxy';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';

const app = Fastify({ logger: true });
const allowedOrigins = env.ALLOWED_ORIGINS;

async function bootstrap() {
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === '*' ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Health (local — not proxied)
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
      api_exchange: env.UPSTREAM_API_EXCHANGE,
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

  // /api/users/cron/* -> api-users (public; authenticated via CRON_SECRET header
  // inside the service). Must register BEFORE /api/users/* so the general JWT
  // gate does not intercept it.
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_USERS,
    prefix: '/api/users/cron',
    rewritePrefix: '/api/users/cron',
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

  // Exchange — public read-only endpoints.
  // /api/exchange/tokens -> api-exchange
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/exchange/tokens',
    rewritePrefix: '/api/exchange/tokens',
    http2: false,
  });

  // /api/exchange/liquidity -> api-exchange
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/exchange/liquidity',
    rewritePrefix: '/api/exchange/liquidity',
    http2: false,
  });

  // Exchange — authenticated endpoints (identity propagated).
  // /api/exchange/buy-pxo -> api-exchange
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/exchange/buy-pxo',
    rewritePrefix: '/api/exchange/buy-pxo',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  // /api/exchange/sell-pxo -> api-exchange
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/exchange/sell-pxo',
    rewritePrefix: '/api/exchange/sell-pxo',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  // /api/exchange/gas-subsidy -> api-exchange
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/exchange/gas-subsidy',
    rewritePrefix: '/api/exchange/gas-subsidy',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  // /api/exchange/orders -> api-exchange
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/exchange/orders',
    rewritePrefix: '/api/exchange/orders',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  // /api/prices -> api-exchange (public)
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/prices',
    rewritePrefix: '/api/prices',
    http2: false,
  });

  // /api/admin/pricing-rules -> api-exchange (authenticated, admin enforced inside).
  await app.register(httpProxy, {
    upstream: env.UPSTREAM_API_EXCHANGE,
    prefix: '/api/admin/pricing-rules',
    rewritePrefix: '/api/admin/pricing-rules',
    http2: false,
    preHandler: requireAuth,
    replyOptions: injectIdentity,
  });

  await app.listen({ port: env.PORT, host: env.HOST });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

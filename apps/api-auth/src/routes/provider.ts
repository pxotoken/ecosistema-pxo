import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { thirdwebAuth, JWT_EXPIRATION_SECONDS } from '../lib/thirdweb-auth.js';
import { buildAuthCookies } from '../lib/cookies.js';
import { authPreHandler } from '../middleware/auth.js';
import type { UserService } from '../services/UserService.js';
import { env } from '../config/env.js';

interface ProviderBody {
  walletProvider?: string;
  providerClass?: string;
}

function normalizeProviderInput(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 100);
}

export function providerRoutes(userService: UserService): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: ProviderBody }>(
      '/provider',
      { preHandler: authPreHandler(userService) },
      async (req, reply) => {
        const walletProvider = normalizeProviderInput(req.body?.walletProvider, 'unknown');
        const providerClass = normalizeProviderInput(req.body?.providerClass, 'external_wallet');
        const user = req.user!;
        const walletAddress = user.wallet_address as string;

        let dbUpdated = false;
        let dbError: string | null = null;
        try {
          await userService.updateUser({
            id: user.id,
            auth_provider: walletProvider,
            auth_provider_class: providerClass,
          });
          dbUpdated = true;
        } catch (err) {
          dbError = err instanceof Error ? err.message : String(err);
          req.log.error({ err }, 'failed to persist auth provider in users table');
        }

        const now = Math.floor(Date.now() / 1000);
        const jwt = await thirdwebAuth.generateJWT({
          payload: {
            address: walletAddress,
            chain_id: 1,
            domain: env.THIRDWEB_AUTH_DOMAIN || String(req.headers.host ?? ''),
            expiration_time: (now + JWT_EXPIRATION_SECONDS).toString(),
            invalid_before: now.toString(),
            nonce: Math.random().toString(36).substring(2, 15),
            context: {
              auth_provider: walletProvider,
              auth_provider_class: providerClass,
            },
          } as never,
        });

        const currentUser = await userService.getUserByWalletAddress(walletAddress);
        const responseUser = currentUser || user;

        reply.header('Set-Cookie', buildAuthCookies(jwt, responseUser));

        return reply.code(200).send({
          success: true,
          walletProvider,
          providerClass,
          dbUpdated,
          dbError,
        });
      },
    );
  };
}

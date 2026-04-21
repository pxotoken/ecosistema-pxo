import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { thirdwebAuth, JWT_EXPIRATION_SECONDS } from '../lib/thirdweb-auth.js';
import { fetchInAppWalletMetadataFromThirdweb } from '../lib/thirdweb-metadata.js';
import { buildAuthCookies } from '../lib/cookies.js';
import type { UserService } from '../services/UserService.js';
import { env } from '../config/env.js';

interface LoginBody {
  payload?: {
    payload: unknown;
    signature: string;
  };
}

export function loginRoutes(userService: UserService): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: LoginBody }>('/login-vercel', async (req, reply) => {
      const { payload } = req.body ?? {};
      if (!payload) {
        return reply.code(400).send({ error: 'Missing payload' });
      }

      const verified = await thirdwebAuth.verifyPayload({
        payload: payload.payload as never,
        signature: payload.signature,
      });
      if (!verified.valid) {
        return reply.code(401).send({ error: 'Invalid payload' });
      }

      const walletAddress = verified.payload.address;

      let walletData: Awaited<ReturnType<typeof fetchInAppWalletMetadataFromThirdweb>> = [];
      try {
        walletData = await fetchInAppWalletMetadataFromThirdweb({ queryBy: 'walletAddress', walletAddress });
      } catch (err) {
        req.log.warn({ err }, 'failed to fetch thirdweb wallet metadata — falling back to external wallet path');
      }

      let userEmail = '';
      let providerId = walletAddress;

      if (!walletData || walletData.length === 0) {
        userEmail = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}@wallet.local`;
        providerId = walletAddress;
      } else {
        const walletInfo = walletData[0];
        userEmail = walletInfo.email || walletInfo.linkedAccounts?.[0]?.details?.email || '';
        providerId = walletInfo.userId || walletAddress;
      }

      let user;
      try {
        user = await userService.getOrCreateUser(walletAddress, userEmail, providerId);
      } catch (err) {
        req.log.warn({ err }, 'getOrCreateUser failed — trying minimal createUser');
        try {
          user = await userService.createUser({
            mail: userEmail,
            provider_id: providerId,
            wallet_address: walletAddress,
            KYC_status: 'PENDING',
          });
        } catch (createErr) {
          req.log.error({ err: createErr }, 'Failed to create user');
          return reply.code(500).send({ error: 'Failed to create user' });
        }
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
        } as never,
      });

      reply.header('Set-Cookie', buildAuthCookies(jwt, user));

      return reply.code(200).send({
        success: true,
        jwt,
        user,
        expiresIn: JWT_EXPIRATION_SECONDS,
        message: 'Login successful',
      });
    });
  };
}

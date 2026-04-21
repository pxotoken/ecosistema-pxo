import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { thirdwebAuth } from '../lib/thirdweb-auth.js';
import { parseCookies } from '../lib/cookies.js';
import type { UserService } from '../services/UserService.js';

interface VerifyBody {
  jwt?: string;
}

export function verifyRoutes(userService: UserService): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: VerifyBody }>('/verify-localStorage', async (req, reply) => {
      const cookies = parseCookies(req.headers.cookie);
      const jwt = req.body?.jwt || cookies.pxo_jwt;
      if (!jwt) {
        return reply.code(401).send({ error: 'No JWT token found' });
      }

      const authResult = await thirdwebAuth.verifyJWT({ jwt });
      if (!authResult.valid) {
        return reply.code(401).send({ error: 'Invalid JWT token' });
      }

      const walletAddress = authResult.parsedJWT.sub;
      const user = await userService.getUserByWalletAddress(walletAddress);
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      return reply.code(200).send({
        success: true,
        user,
        message: 'Authentication verified',
      });
    });
  };
}

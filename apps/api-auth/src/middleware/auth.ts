import type { FastifyReply, FastifyRequest } from 'fastify';
import { thirdwebAuth } from '../lib/thirdweb-auth.js';
import { parseCookies } from '../lib/cookies.js';
import type { User } from '../repositories/UserRepository.js';
import type { UserService } from '../services/UserService.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export function authPreHandler(userService: UserService) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req.headers.cookie);
    const jwt = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ?? cookies.pxo_jwt;
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
    req.user = user;
  };
}

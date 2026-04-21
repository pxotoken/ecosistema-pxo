import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { buildClearCookies } from '../lib/cookies.js';

export const logoutRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/logout', async (_req, reply) => {
    reply.header('Set-Cookie', buildClearCookies());
    return reply.code(200).send({ success: true, message: 'Logout successful' });
  });
};

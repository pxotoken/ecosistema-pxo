import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { updateProfileSchema } from '@pxo/shared/schemas/users';
import { UserRepository, type UpdateProfileInput } from '../lib/user-repository.js';
import { requireCaller } from '../middleware/identity.js';

export function usersRoutes(users: UserRepository): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.addHook('preHandler', requireCaller);

    app.get('/me', async (req, reply) => {
      const wallet = req.caller!.walletAddress;
      const user = await users.getByWalletAddress(wallet);
      if (!user) return reply.code(404).send({ error: 'User not found' });
      return reply.send({ user });
    });

    app.patch<{ Body: UpdateProfileInput }>('/me', async (req, reply) => {
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        return reply.code(400).send({
          error: 'Invalid request data',
          details: error.details.map((d) => d.message),
        });
      }
      const caller = await users.getByWalletAddress(req.caller!.walletAddress);
      if (!caller) return reply.code(404).send({ error: 'User not found' });

      const updated = await users.updateProfile(caller.id, value as UpdateProfileInput);
      return reply.send({ user: updated });
    });

    // Admin read by id — admin authorization will be enforced at the orchestrator
    // via role claims on the JWT. For now we only check the caller is present.
    app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
      const user = await users.getById(req.params.id);
      if (!user) return reply.code(404).send({ error: 'User not found' });
      return reply.send({ user });
    });
  };
}

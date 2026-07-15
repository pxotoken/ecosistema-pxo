import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { updateProfileSchema } from '@pxo/shared/schemas/users';
import {
  UserRepository,
  ClabeConflictError,
  ClabeLockedError,
  type UpdateProfileInput,
} from '../lib/user-repository.js';
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

      // Lock CLABE edits when an active deposit intent exists. Prevents a
      // user from redirecting an in-flight SPEI matcher mid-flow.
      const patch = value as UpdateProfileInput;
      const currentClabe = (caller as { CLABE?: string | null }).CLABE ?? null;
      const wantsClabeChange =
        patch.CLABE !== undefined && patch.CLABE !== currentClabe;
      if (wantsClabeChange) {
        try {
          if (await users.hasActiveDepositIntent(caller.id)) {
            throw new ClabeLockedError();
          }
        } catch (err) {
          if (err instanceof ClabeLockedError) {
            return reply.code(409).send({
              error: 'CLABE_LOCKED',
              message:
                'You have an open deposit intent. Wait for it to complete or expire before changing your CLABE.',
            });
          }
          throw err;
        }
      }

      try {
        const updated = await users.updateProfile(caller.id, patch);
        return reply.send({ user: updated });
      } catch (err) {
        if (err instanceof ClabeConflictError) {
          return reply.code(409).send({
            error: 'CLABE_CONFLICT',
            message:
              'This CLABE cannot be registered. Please contact support if you believe this is an error.',
          });
        }
        throw err;
      }
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

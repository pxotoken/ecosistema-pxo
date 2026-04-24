import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRepository, type UserRow } from '../lib/user-repository.js';
import { requireAdmin } from '../middleware/admin.js';

const ADMIN_UUID = '989e3702-b515-4d6e-8627-fa0142a1a88f';
const ADMIN_EMAIL = 'admin@pxo.com';

interface ListQuery {
  search?: string;
  limit?: string;
  offset?: string;
}

interface UpdateRoleBody {
  userId?: string;
  action?: 'grant_admin' | 'revoke_admin';
}

function withRole(user: UserRow): UserRow & { is_admin: boolean; role: 'admin' | 'user' } {
  const userType = typeof user.user_type === 'string' ? user.user_type : '';
  const isAdmin = userType.includes(ADMIN_UUID) || user.mail === ADMIN_EMAIL;
  return { ...user, is_admin: isAdmin, role: isAdmin ? 'admin' : 'user' };
}

export function adminUsersRoutes(users: UserRepository): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.addHook('preHandler', requireAdmin);

    app.get<{ Querystring: ListQuery }>('/', async (req, reply) => {
      const limit = Math.min(Math.max(parseInt(req.query.limit ?? '50', 10) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset ?? '0', 10) || 0, 0);
      const search = req.query.search?.trim() || undefined;

      const { users: rows, total } = await users.listPaginated({ search, limit, offset });

      return reply.send({
        data: rows.map(withRole),
        count: total,
        pagination: { limit, offset, total },
      });
    });

    app.put<{ Body: UpdateRoleBody }>('/', async (req, reply) => {
      const { userId, action } = req.body ?? {};
      if (!userId || !action) {
        return reply.code(400).send({ error: 'Missing required fields: userId, action' });
      }
      if (action !== 'grant_admin' && action !== 'revoke_admin') {
        return reply.code(400).send({ error: 'Invalid action. Use grant_admin or revoke_admin' });
      }

      const user = await users.getById(userId);
      if (!user) return reply.code(404).send({ error: 'User not found' });

      const currentType = typeof user.user_type === 'string' ? user.user_type : '';
      let nextType: string | null;

      if (action === 'grant_admin') {
        nextType = currentType.includes(ADMIN_UUID)
          ? currentType
          : currentType
            ? `${currentType},${ADMIN_UUID}`
            : ADMIN_UUID;
      } else {
        const filtered = currentType
          .split(',')
          .map((s) => s.trim())
          .filter((uuid) => uuid !== ADMIN_UUID && uuid !== '')
          .join(',');
        nextType = filtered === '' ? null : filtered;
      }

      const updated = await users.updateUserType(userId, nextType);

      return reply.send({
        data: withRole(updated),
        message: `Admin role ${action === 'grant_admin' ? 'granted' : 'revoked'} successfully`,
      });
    });
  };
}

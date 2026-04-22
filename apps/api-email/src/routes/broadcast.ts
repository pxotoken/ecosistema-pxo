import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { broadcastSchema } from '@pxo/shared/schemas/email';
import type { EmailService } from '../lib/email-service.js';

interface BroadcastBody {
  subject: string;
  message: string;
  emails?: string[];
}

export function broadcastRoutes(emailService: EmailService): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: BroadcastBody }>('/broadcast', async (req, reply) => {
      const { error, value } = broadcastSchema.validate(req.body);
      if (error) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid request data',
          errors: error.details.map((d) => d.message),
        });
      }

      const { subject, message, emails } = value as BroadcastBody;
      const result =
        emails && emails.length > 0
          ? await emailService.sendBroadcastToEmails(subject, message, emails)
          : await emailService.sendBroadcastEmail(subject, message);

      return reply.code(200).send({
        success: true,
        message: 'Broadcast email completed',
        data: {
          totalUsers: result.totalUsers,
          sent: result.sent,
          failed: result.failed,
          errors: result.failed > 0 ? result.errors : undefined,
        },
      });
    });
  };
}

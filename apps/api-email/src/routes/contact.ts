import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { contactSchema } from '@pxo/shared/schemas/email';
import { EmailService } from '../lib/email-service.js';
import { EMAIL_CONFIG } from '../lib/resend.js';
import { getContactEmailTemplate } from '../templates/contact.js';

interface ContactBody {
  email: string;
  message: string;
}

export function contactRoutes(emailService: EmailService): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.post<{ Body: ContactBody }>('/contact', async (req, reply) => {
      const { error, value } = contactSchema.validate(req.body);
      if (error) {
        return reply.code(400).send({
          error: 'Invalid request data',
          details: error.details.map((d) => d.message),
        });
      }

      const { email, message } = value as ContactBody;
      const html = getContactEmailTemplate(email, message);

      await emailService.sendEmail({
        to: EMAIL_CONFIG.replyTo,
        subject: `Nuevo mensaje de contacto - ${email}`,
        html,
      });

      return reply.code(200).send({ success: true, message: 'Message sent successfully' });
    });
  };
}

import { EMAIL_CONFIG, getResendClient } from './resend.js';
import { getNotificationEmailTemplate } from '../templates/notification.js';
import type { UserRepository } from './user-repository.js';

interface SendParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface BroadcastResult {
  success: true;
  totalUsers: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export class EmailService {
  constructor(private readonly users?: UserRepository) {}

  async sendEmail({ to, subject, html, from }: SendParams): Promise<{ success: true; id?: string }> {
    const resend = getResendClient();
    if (!resend) throw new Error('Email service not configured');

    const fromEmail = from ?? `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`;
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      reply_to: EMAIL_CONFIG.replyTo,
    } as Parameters<typeof resend.emails.send>[0]);

    const id = (result as { id?: string }).id;
    return { success: true, id };
  }

  async sendBroadcastEmail(subject: string, message: string): Promise<BroadcastResult> {
    if (!this.users) throw new Error('UserRepository is required for broadcast-to-all');
    const activeUsers = await this.users.getAllActiveUsers();

    const res: BroadcastResult = { success: true, totalUsers: activeUsers.length, sent: 0, failed: 0, errors: [] };
    for (const user of activeUsers) {
      try {
        await this.sendEmail({
          to: user.mail,
          subject,
          html: getNotificationEmailTemplate(message, user.first_name ?? ''),
        });
        res.sent++;
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        res.failed++;
        res.errors.push({ email: user.mail, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return res;
  }

  async sendBroadcastToEmails(subject: string, message: string, emails: string[]): Promise<BroadcastResult> {
    const res: BroadcastResult = { success: true, totalUsers: emails.length, sent: 0, failed: 0, errors: [] };
    for (const email of emails) {
      try {
        await this.sendEmail({
          to: email,
          subject,
          html: getNotificationEmailTemplate(message),
        });
        res.sent++;
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        res.failed++;
        res.errors.push({ email, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return res;
  }
}

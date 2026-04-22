import { Resend } from 'resend';
import { env } from '../config/env.js';

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set — email sending disabled');
    return null;
  }
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export const EMAIL_CONFIG = {
  fromEmail: env.RESEND_FROM_EMAIL,
  fromName: env.RESEND_FROM_NAME,
  replyTo: env.RESEND_REPLY_TO,
};

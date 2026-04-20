/**
 * Contact Form Endpoint
 * Handles contact form submissions and sends emails
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailService } from '../../lib/services/EmailService.js';
import { getContactEmailTemplate } from '../../lib/utils/index.js';
import { EMAIL_CONFIG } from '../../lib/resend.js';
import { HTTP_METHODS, HTTP_STATUS } from '@pxo/shared/consts/http';
import { validateBody } from '@pxo/shared/helpers/validateBody';
import { contactSchema } from '@pxo/shared/schemas';
import type { ContactFormData } from '@pxo/shared/types/email';

const emailService = new EmailService();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === HTTP_METHODS.OPTIONS) {
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  if (req.method !== HTTP_METHODS.POST) {
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const formData = validateBody<ContactFormData>(contactSchema, req, res);
    if (!formData) return;

    const { email, message } = formData;

    const html = getContactEmailTemplate(email, message);

    await emailService.sendEmail({
      to: EMAIL_CONFIG.replyTo,
      subject: `Nuevo mensaje de contacto - ${email}`,
      html,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Error in contact form API:', {
      message: error.message,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to send message',
      details: error.message,
    });
  }
}

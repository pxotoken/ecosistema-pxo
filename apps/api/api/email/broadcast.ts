import { EmailService } from '../../lib/services/EmailService.js';
import { HTTP_METHODS, HTTP_STATUS } from '@pxo/shared/consts/http';
import { broadcastSchema } from '@pxo/shared/schemas/email';
import type { BroadcastEmailRequest, BroadcastEmailResult } from '@pxo/shared/types/email';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * API endpoint to send broadcast emails to all active users
 * POST /api/email/broadcast
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== HTTP_METHODS.POST) {
    return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
      success: false,
      message: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Validate request body
    const { error, value } = broadcastSchema.validate(req.body);
    
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid request data',
        errors: error.details.map(d => d.message)
      });
    }

    const { subject, message, emails } = value as BroadcastEmailRequest;

    const emailService = new EmailService();

    let result: BroadcastEmailResult;
    if (emails && emails.length > 0) {
      result = await emailService.sendBroadcastToEmails(subject, message, emails) as BroadcastEmailResult;
    } else {
      result = await emailService.sendBroadcastEmail(subject, message) as BroadcastEmailResult;
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Broadcast email completed',
      data: {
        totalUsers: result.totalUsers,
        sent: result.sent,
        failed: result.failed,
        errors: result.failed > 0 ? result.errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Error in broadcast email endpoint:', error);
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

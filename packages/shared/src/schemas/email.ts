/**
 * Email Joi Schemas
 * Validation schemas for all email endpoints
 */

import Joi from 'joi';

/**
 * Schema for contact form (POST /api/email/contact)
 */
export const contactSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.email': 'Invalid email format',
    }),
    message: Joi.string().min(10).max(5000).required().messages({
        'string.min': 'Message must be at least 10 characters long',
        'string.max': 'Message must be less than 5000 characters',
    }),
});

/**
 * Schema for broadcast email (POST /api/email/broadcast)
 */
export const broadcastSchema = Joi.object({
  subject: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).required(),
  emails: Joi.array().items(Joi.string().email()).optional()
});

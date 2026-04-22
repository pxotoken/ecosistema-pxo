/**
 * Users Joi Schemas
 * Validation schemas for api-users endpoints.
 */
import Joi from 'joi';

/**
 * Schema for updating current user's profile (PATCH /api/users/me)
 * All fields optional — caller may send a partial patch.
 */
export const updateProfileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).optional(),
  last_name: Joi.string().trim().min(1).max(100).optional(),
  profile_picture: Joi.string().uri().max(2048).optional(),
  country: Joi.string().trim().length(2).uppercase().optional(), // ISO-3166 alpha-2
  phone: Joi.string()
    .pattern(/^\+?[0-9 ()-]{6,20}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Invalid phone format' }),
})
  .min(1)
  .messages({ 'object.min': 'At least one field must be provided' });

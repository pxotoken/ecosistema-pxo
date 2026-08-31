/**
 * Body Validation Middleware
 * Validates request body using Joi schemas
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ObjectSchema } from 'joi';
import { HTTP_STATUS } from '../consts/http.ts';

/**
 * Validates request body against a Joi schema
 * @param schema - Joi schema to validate against
 * @returns Validated data or sends error response
 */
export function validateBody<T>(
  schema: ObjectSchema,
  req: VercelRequest,
  res: VercelResponse
): T | null {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map((err) => err.message),
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return value as T;
}

/**
 * Validates request query params against a Joi schema
 * @param schema - Joi schema to validate against
 * @returns Validated data or sends error response
 */
export function validateQuery<T>(
  schema: ObjectSchema,
  req: VercelRequest,
  res: VercelResponse
): T | null {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true, // Convert strings to numbers/booleans automatically
  });

  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map((err) => err.message),
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return value as T;
}

/**
 * KYC Joi Schemas
 * Validation schemas for api-kyc endpoints.
 */
import Joi from 'joi';

const documentSchema = Joi.object({
  type: Joi.string().valid('id_front', 'id_back', 'selfie', 'proof_of_address').required(),
  path: Joi.string().min(1).max(512).required(),
});

const personalInfoSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(200).required(),
  dateOfBirth: Joi.string().isoDate().required(),
  country: Joi.string().trim().length(2).uppercase().required(),
  documentType: Joi.string().valid('passport', 'ine', 'dni', 'other').required(),
  documentNumber: Joi.string().trim().min(3).max(64).required(),
  // ADR 0002 D1.3 — auditoría: el frontend duplica email/phone aquí además de users.
  // No usamos Joi.email() porque algunos usuarios entran con un placeholder generado
  // por la wallet (formato "0x...@wallet.local") que viola RFC 5321 por dots
  // consecutivos. El form ya valida formato user-facing.
  email: Joi.string().trim().min(3).max(254).optional(),
  phone: Joi.string().trim().min(5).max(32).optional(),
});

/**
 * Schema for POST /api/kyc/submit (user-facing)
 */
export const submitKycSchema = Joi.object({
  documents: Joi.array().items(documentSchema).min(1).max(10).required(),
  personalInfo: personalInfoSchema.required(),
});

/**
 * Schema for POST /api/kyc/submissions/:id/review (admin)
 */
export const reviewKycSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  rejectionReason: Joi.when('action', {
    is: 'reject',
    then: Joi.string().trim().min(3).max(500).required(),
    otherwise: Joi.forbidden(),
  }),
});

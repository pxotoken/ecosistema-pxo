import Joi from 'joi';

export const generatePaymentSchema = Joi.object({
  amount: Joi.number().positive().min(0.01).required(),
  merchantId: Joi.string().required(),
  currency: Joi.string().valid('PXO').required(),
  posId: Joi.string().required(),
  reference: Joi.string().optional(),
});

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export const createChargeIntentSchema = Joi.object({
  clientWalletAddress: Joi.string().pattern(EVM_ADDRESS_PATTERN).required(),
  amount: Joi.number().positive().min(0.01).required(),
  merchantId: Joi.string().required(),
  posId: Joi.string().required(),
  reference: Joi.string().optional(),
});

export const pendingChargeQuerySchema = Joi.object({
  wallet: Joi.string().pattern(EVM_ADDRESS_PATTERN).required(),
});

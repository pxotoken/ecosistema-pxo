import Joi from 'joi';

export const generatePaymentSchema = Joi.object({
  amount: Joi.number().positive().min(0.01).required(),
  merchantId: Joi.string().required(),
  currency: Joi.string().valid('PXO').required(),
  posId: Joi.string().required(),
  reference: Joi.string().optional(),
});

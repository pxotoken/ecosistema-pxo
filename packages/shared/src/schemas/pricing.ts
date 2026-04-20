import Joi from 'joi';

export const getPricesSchema = Joi.object({
  pair: Joi.string().required().uppercase().messages({
    'any.required': 'Missing required parameter: pair',
    'string.empty': 'Pair cannot be empty',
  }),
});


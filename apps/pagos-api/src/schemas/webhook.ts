import Joi from 'joi';

export const polygonTransferWebhookSchema = Joi.object({
  txHash: Joi.string().required(),
  from: Joi.string().required(),
  to: Joi.string().required(),
  value: Joi.string().required(),
  blockNumber: Joi.number().integer().required(),
  blockTimestamp: Joi.number().integer().required(),
  contractAddress: Joi.string().required(),
});

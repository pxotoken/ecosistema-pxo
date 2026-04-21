export const paymentRateLimitConfig = {
  max: 30,
  timeWindow: '1 minute',
} as const;

export const webhookRateLimitConfig = {
  max: 200,
  timeWindow: '1 minute',
} as const;

export const env = {
  // Server
  PORT: Number(process.env.PORT) || 3001,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  // TODO: pedir al admin del proyecto Supabase la SERVICE ROLE KEY para QA.
  // El backend la necesita para operar saltando RLS (insertar/actualizar payments y merchants sin políticas de usuario).
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Thirdweb
  THIRDWEB_CLIENT_ID: process.env.VITE_THIRDWEB_CLIENT_ID || '',
  THIRDWEB_AUTH_DOMAIN: process.env.VITE_THIRDWEB_AUTH_DOMAIN || '',
  THIRDWEB_ADMIN_PRIVATE_KEY: process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '',

  // Polygon Amoy / PXO Token
  POLYGON_AMOY_PXO_RECEIVER_ADDRESS: process.env.POLYGON_AMOY_PXO_RECEIVER_ADDRESS || '',
  PXO_TOKEN_ADDRESS_TESTNET: process.env.PXO_TOKEN_ADDRESS_TESTNET || '',
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || '',

  // Wallet
  WALLET_PRIVATE_KEY_ENCRYPTED: process.env.WALLET_PRIVATE_KEY_ENCRYPTED || '',

  // Binance
  BINANCE_API_KEY: process.env.BINANCE_API_KEY || '',
  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || '',

  // Resend (email)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '',
  RESEND_FROM_NAME: process.env.RESEND_FROM_NAME || '',
  RESEND_REPLY_TO: process.env.RESEND_REPLY_TO || '',

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // Cron
  CRON_SECRET: process.env.CRON_SECRET || '',

  // Session / Admin
  SESSION_WARNING_THRESHOLD: Number(process.env.VITE_SESSION_WARNING_THRESHOLD) || 120,
  ENABLE_ADMIN_TESTNET: process.env.VITE_ENABLE_ADMIN_TESTNET === 'true',
} as const;

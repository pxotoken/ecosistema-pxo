export const env = {
  PORT: Number(process.env.PORT) || 3008,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3003')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',

  THIRDWEB_CLIENT_ID: process.env.VITE_THIRDWEB_CLIENT_ID || '',
  THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY || '',

  WALLET_PRIVATE_KEY_ENCRYPTED: process.env.WALLET_PRIVATE_KEY_ENCRYPTED || '',
  WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY || '',
  ENCRYPTER_PRIVATE_KEY: process.env.ENCRYPTER_PRIVATE_KEY || '',

  PXO_TOKEN_ADDRESS_MAINNET: process.env.PXO_TOKEN_ADDRESS_MAINNET || '',
  PXO_TOKEN_ADDRESS_TESTNET: process.env.PXO_TOKEN_ADDRESS_TESTNET || '',

  POLYGON_PXO_RECEIVER_ADDRESS: process.env.POLYGON_PXO_RECEIVER_ADDRESS || '',
  POLYGON_AMOY_PXO_RECEIVER_ADDRESS: process.env.POLYGON_AMOY_PXO_RECEIVER_ADDRESS || '',
  BSC_PXO_RECEIVER_ADDRESS: process.env.BSC_PXO_RECEIVER_ADDRESS || '',

  POLYGON_DEFAULT_TOKEN: process.env.POLYGON_DEFAULT_TOKEN || '',
  POLYGON_AMOY_DEFAULT_TOKEN: process.env.POLYGON_AMOY_DEFAULT_TOKEN || '',
  BSC_DEFAULT_TOKEN: process.env.BSC_DEFAULT_TOKEN || '',

  FORCE_POLYGON_MAINNET: process.env.FORCE_POLYGON_MAINNET === 'true',

  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com/api/v3',

  MAX_GAS_SUBSIDIES_PER_DAY: Number(process.env.MAX_GAS_SUBSIDIES_PER_DAY) || 100,
  GAS_SUBSIDY_MIN_INTERVAL_MINUTES: Number(process.env.GAS_SUBSIDY_MIN_INTERVAL_MINUTES) || 1,
  MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI: process.env.MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI || '',

  CONEKTA_API_BASE_URL: process.env.CONEKTA_API_BASE_URL || 'https://api.conekta.io',
  CONEKTA_PRIVATE_KEY: process.env.CONEKTA_PRIVATE_KEY || '',
  CONEKTA_WEBHOOK_SECRET: process.env.CONEKTA_WEBHOOK_SECRET || '',
  CONEKTA_SUCCESS_URL: process.env.CONEKTA_SUCCESS_URL || 'http://localhost:5173/dashboard/fiat?status=success',
  CONEKTA_FAILURE_URL: process.env.CONEKTA_FAILURE_URL || 'http://localhost:5173/dashboard/fiat?status=failure',

  BITSO_API_BASE_URL: process.env.BITSO_API_BASE_URL || 'https://stage.bitso.com/api/v3',
  BITSO_API_KEY: process.env.BITSO_API_KEY || '',
  BITSO_API_SECRET: process.env.BITSO_API_SECRET || '',
  BITSO_WEBHOOK_SECRET: process.env.BITSO_WEBHOOK_SECRET || '',

  FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK:
    process.env.FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK === 'true',
} as const;

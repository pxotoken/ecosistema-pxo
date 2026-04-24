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

  FORCE_POLYGON_MAINNET: process.env.FORCE_POLYGON_MAINNET === 'true',

  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com/api/v3',
} as const;

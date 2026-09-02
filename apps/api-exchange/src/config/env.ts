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

  // Pair-pricing source: 'binance' (default) or 'bitso'. See createPriceProvider.
  PRICE_PROVIDER: (process.env.PRICE_PROVIDER || 'binance').toLowerCase(),
  // Bitso PUBLIC ticker API (no auth) — distinct from the authenticated
  // Business API in BITSO_API_BASE_URL. Only used when PRICE_PROVIDER=bitso.
  BITSO_TICKER_BASE_URL: process.env.BITSO_TICKER_BASE_URL || 'https://api.bitso.com/v3',
  // Bitso has no USDC market, so USDC is priced off USDT. If true, correct that
  // assumption with a live USDC/USDT rate from Binance (BINANCE_API_BASE_URL);
  // if false, assume USDC == USDT exactly (1:1). Only applies when
  // PRICE_PROVIDER=bitso.
  BITSO_USDC_CORRECTION_ENABLED: process.env.BITSO_USDC_CORRECTION_ENABLED === 'true',

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
  // Bitso v4 webhooks. There is no shared secret: events are signed with
  // Bitso's RSA key and verified against the public key served here.
  // Prod is https://api.bitso.com/v4. The v4 PDF is inconsistent here —
  // section 2 says v4 drops /api/ from api.bitso.com, while the 2.7.1
  // curl example shows bitso.com with no api. subdomain. Bitso confirmed
  // (2026-09-02) that the public-key endpoint resolves on both hosts; we
  // use api.bitso.com to match BITSO_TICKER_BASE_URL.
  BITSO_WEBHOOK_API_BASE_URL:
    process.env.BITSO_WEBHOOK_API_BASE_URL || 'https://stage.bitso.com/v4',
  // Comma-separated egress IPs Bitso delivers from. Empty disables the
  // check (stage/local). Prod: 52.15.91.227,18.216.72.107,18.219.140.132
  BITSO_WEBHOOK_IP_ALLOWLIST: process.env.BITSO_WEBHOOK_IP_ALLOWLIST || '',

  // SPEI deposit flow — destination CLABE and beneficiary shown to the user
  // in the buy-with-MXN instructions. Must be the CLABE of the Bitso
  // Business account we own; the matching worker reads inbound fundings there.
  BITSO_BUSINESS_CLABE: process.env.BITSO_BUSINESS_CLABE || '',
  BITSO_BUSINESS_BENEFICIARY_NAME:
    process.env.BITSO_BUSINESS_BENEFICIARY_NAME || 'PXO Treasury MX',

  // Deposit intent lifecycle. Configurable per environment.
  DEPOSIT_INTENT_TTL_HOURS: Number(process.env.DEPOSIT_INTENT_TTL_HOURS) || 24,
  DEPOSIT_MATCH_WORKER_INTERVAL_MS:
    Number(process.env.DEPOSIT_MATCH_WORKER_INTERVAL_MS) || 30_000,
  DEPOSIT_MATCH_WORKER_ENABLED:
    process.env.DEPOSIT_MATCH_WORKER_ENABLED !== 'false', // default on

  FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK:
    process.env.FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK === 'true',

  // QA-only self-serve tool to simulate SPEI deposits via Bitso's stage
  // `/spei/test/deposits` endpoint. NEVER enable in production. The
  // /qa/mock-bitso-deposit route is registered only when this is true.
  MOCK_DEPOSITS_ENABLED: process.env.MOCK_DEPOSITS_ENABLED === 'true',
} as const;

export const env = {
  // Server
  PORT: Number(process.env.PORT) || 3001,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3003')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Supabase — backend uses secret key (service role) to bypass RLS
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',

  // Payments chain — parametrised to decouple from any single L2.
  // Supported: 80002 (Polygon Amoy, dev default), 137 (Polygon Mainnet).
  // Chain 56 was listed here as "production target per DF-POSBlokko" until
  // 2026-09-02. That is no longer the plan — Polygon only for this phase.
  PAYMENTS_CHAIN_ID: Number(process.env.PAYMENTS_CHAIN_ID) || 80002,

  // RPC endpoints (optional overrides; fall back to public RPCs).
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || '',
  POLYGON_MAINNET_RPC_URL: process.env.POLYGON_MAINNET_RPC_URL || '',

  // PXO token address per chain (resolved in chains.ts).
  PXO_TOKEN_ADDRESS_MAINNET: process.env.PXO_TOKEN_ADDRESS_MAINNET || '',
  PXO_TOKEN_ADDRESS_TESTNET: process.env.PXO_TOKEN_ADDRESS_TESTNET || '',

  // Payment TTL (minutes) — DF says 5; configurable for tests.
  PAYMENT_TTL_MINUTES: Number(process.env.PAYMENT_TTL_MINUTES) || 5,

  // PULL charge intent TTL (seconds). El comercio espera presencialmente la
  // firma del cliente, así que la ventana es corta.
  CHARGE_INTENT_TTL_SECONDS: Number(process.env.CHARGE_INTENT_TTL_SECONDS) || 90,

  // HMAC secrets.
  // - Inbound webhook (QuickNode / Alchemy) → X-QN-Signature
  WEBHOOK_INBOUND_SECRET: process.env.WEBHOOK_INBOUND_SECRET || '',
  // - Outbound webhook (api-pagos → POS) → X-PXO-Signature. Per-merchant override
  //   lives in merchants.callback_secret; this is the fallback used when empty.
  WEBHOOK_OUTBOUND_SECRET: process.env.WEBHOOK_OUTBOUND_SECRET || '',

  // Worker intervals (ms).
  EXPIRATION_WORKER_INTERVAL_MS: Number(process.env.EXPIRATION_WORKER_INTERVAL_MS) || 30_000,
  RECONCILIATION_WORKER_INTERVAL_MS:
    Number(process.env.RECONCILIATION_WORKER_INTERVAL_MS) || 60_000,
} as const;

export const env = {
  PORT: Number(process.env.PORT) || 3006,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3003')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',

  // Admin authorization — comma-separated wallet addresses allowed to review KYC.
  // Replace with proper role claims when admin RBAC is ready.
  KYC_ADMIN_WALLETS: (process.env.KYC_ADMIN_WALLETS || '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
} as const;

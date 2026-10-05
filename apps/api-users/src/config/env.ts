export const env = {
  PORT: Number(process.env.PORT) || 3005,
  // '::' rather than '0.0.0.0': Railway's private network is IPv6-only, so a
  // service bound to IPv4 is unreachable at <service>.railway.internal. Node
  // binds dual-stack here, so public IPv4 traffic still works. See SL-021.
  HOST: process.env.HOST || '::',
  NODE_ENV: process.env.NODE_ENV || 'development',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3003')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',

  CRON_SECRET: process.env.CRON_SECRET || '',
} as const;

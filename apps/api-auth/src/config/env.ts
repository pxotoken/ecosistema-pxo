export const env = {
  PORT: Number(process.env.PORT) || 3002,
  // '::' rather than '0.0.0.0': Railway's private network is IPv6-only, so a
  // service bound to IPv4 is unreachable at <service>.railway.internal. Node
  // binds dual-stack here, so public IPv4 traffic still works. See SL-021.
  HOST: process.env.HOST || '::',
  NODE_ENV: process.env.NODE_ENV || 'development',

  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',

  THIRDWEB_CLIENT_ID: process.env.VITE_THIRDWEB_CLIENT_ID || '',
  THIRDWEB_AUTH_DOMAIN: process.env.VITE_THIRDWEB_AUTH_DOMAIN || '',
  THIRDWEB_ADMIN_PRIVATE_KEY: process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '',
  THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY || '',

  JWT_EXPIRATION_SECONDS: Number(process.env.JWT_EXPIRATION_TIME) || 1800,

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5175')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

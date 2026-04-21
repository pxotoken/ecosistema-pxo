export const env = {
  PORT: Number(process.env.PORT) || 3003,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  UPSTREAM_API_AUTH: process.env.UPSTREAM_API_AUTH || 'http://localhost:3002',
  UPSTREAM_API_PAGOS: process.env.UPSTREAM_API_PAGOS || 'http://localhost:3001',
  UPSTREAM_API_LEGACY: process.env.UPSTREAM_API_LEGACY || 'http://localhost:3000',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  THIRDWEB_CLIENT_ID: process.env.VITE_THIRDWEB_CLIENT_ID || '',
  THIRDWEB_AUTH_DOMAIN: process.env.VITE_THIRDWEB_AUTH_DOMAIN || '',
  THIRDWEB_ADMIN_PRIVATE_KEY: process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '',
  JWT_EXPIRATION_SECONDS: Number(process.env.JWT_EXPIRATION_TIME) || 1800,
} as const;

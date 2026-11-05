export const env = {
  PORT: Number(process.env.PORT) || 3004,
  // '::' rather than '0.0.0.0': Railway's private network is IPv6-only, so a
  // service bound to IPv4 is unreachable at <service>.railway.internal. Node
  // binds dual-stack here, so public IPv4 traffic still works. See SL-021.
  HOST: process.env.HOST || '::',
  NODE_ENV: process.env.NODE_ENV || 'development',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'noreply@pxotoken.com',
  RESEND_FROM_NAME: process.env.RESEND_FROM_NAME || 'PXO Platform',
  RESEND_REPLY_TO: process.env.RESEND_REPLY_TO || 'info@pxotoken.com',

  // Where landing-page contact messages are delivered. Deliberately does NOT
  // fall back to RESEND_REPLY_TO: that one only sets a header on outbound
  // mail, but the contact route used it as the recipient too, so editing the
  // reply-to address silently redirected the contact inbox. Contact mail now
  // reaches info@pxotoken.com unless this var is set explicitly, whatever
  // RESEND_REPLY_TO happens to be in a given environment.
  CONTACT_INBOX_EMAIL: process.env.CONTACT_INBOX_EMAIL || 'info@pxotoken.com',

  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
} as const;

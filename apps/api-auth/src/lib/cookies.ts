import { env } from '../config/env.js';

const MAX_AGE = 30 * 60;

export function buildAuthCookies(jwt: string, user: unknown): string[] {
  const isProd = env.NODE_ENV === 'production';
  const userEncoded = encodeURIComponent(JSON.stringify(user));
  const base = `Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`;
  const secure = isProd ? '; Secure' : '';
  return [
    `pxo_jwt=${jwt}; HttpOnly; ${base}${secure}`,
    `pxo_user=${userEncoded}; ${base}${secure}`,
  ];
}

export function buildClearCookies(): string[] {
  const isProd = env.NODE_ENV === 'production';
  const expired = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const base = `Path=/; SameSite=Lax`;
  const secure = isProd ? '; Secure' : '';
  return [
    `pxo_jwt=; HttpOnly; ${base}${secure}; ${expired}`,
    `pxo_user=; ${base}${secure}; ${expired}`,
  ];
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        if (idx === -1) return [c, ''];
        return [c.slice(0, idx), c.slice(idx + 1)];
      }),
  );
}

import { createAuth } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { createThirdwebClient } from 'thirdweb';
import { env } from '../config/env.js';

if (!env.THIRDWEB_ADMIN_PRIVATE_KEY) {
  throw new Error('Missing THIRDWEB_ADMIN_PRIVATE_KEY');
}
if (!env.THIRDWEB_CLIENT_ID) {
  throw new Error('Missing VITE_THIRDWEB_CLIENT_ID');
}
if (!env.THIRDWEB_AUTH_DOMAIN) {
  throw new Error('Missing VITE_THIRDWEB_AUTH_DOMAIN');
}

export const thirdwebClient = createThirdwebClient({ clientId: env.THIRDWEB_CLIENT_ID });

const adminAccount = privateKeyToAccount({
  client: thirdwebClient,
  privateKey: env.THIRDWEB_ADMIN_PRIVATE_KEY,
});

export const thirdwebAuth: ReturnType<typeof createAuth> = createAuth({
  domain: env.THIRDWEB_AUTH_DOMAIN,
  adminAccount,
  jwt: { expirationTimeSeconds: env.JWT_EXPIRATION_SECONDS },
});

export const JWT_EXPIRATION_SECONDS = env.JWT_EXPIRATION_SECONDS;

import { createAuth, signLoginPayload as thirdwebSignLoginPayload } from 'thirdweb/auth';
import { createThirdwebClient } from 'thirdweb';

export const JWT_EXPIRATION_SECONDS = parseInt(
  import.meta.env.VITE_JWT_EXPIRATION_TIME || '1800',
);

const client = createThirdwebClient({
  clientId: (import.meta.env.VITE_THIRDWEB_CLIENT_ID as string) || '',
});

const thirdwebAuth = createAuth({
  domain:
    (import.meta.env.VITE_THIRDWEB_AUTH_DOMAIN as string) ||
    window.location.host,
  jwt: {
    expirationTimeSeconds: JWT_EXPIRATION_SECONDS,
  },
  client,
});

export const generatePayload = thirdwebAuth.generatePayload;

export const signLoginPayload = async ({
  account,
  payload,
}: {
  account: unknown;
  payload: unknown;
}) =>
  thirdwebSignLoginPayload({
    // Cast to any because thirdweb types account/payload tightly; our hook
    // passes the values obtained from thirdweb/react directly so they match
    // at runtime.
    account: account as Parameters<typeof thirdwebSignLoginPayload>[0]['account'],
    payload: payload as Parameters<typeof thirdwebSignLoginPayload>[0]['payload'],
  });

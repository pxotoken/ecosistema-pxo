import { createAuth, signLoginPayload as thirdwebSignLoginPayload } from "thirdweb/auth";

export const JWT_EXPIRATION_SECONDS = parseInt(import.meta.env.VITE_JWT_EXPIRATION_TIME || "1800");

const thirdwebAuth = createAuth({
  domain: import.meta.env.VITE_THIRDWEB_AUTH_DOMAIN || 
          import.meta.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || 
          window.location.host,
  jwt: {
    expirationTimeSeconds: JWT_EXPIRATION_SECONDS,
  },
});

export const generatePayload = thirdwebAuth.generatePayload;

export const signLoginPayload = async ({ account, payload }: { account: any, payload: any }) => {
  return await thirdwebSignLoginPayload({ account, payload });
};

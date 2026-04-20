import { createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";
const clientId = process.env.VITE_THIRDWEB_CLIENT_ID || "";
const domain = process.env.VITE_THIRDWEB_AUTH_DOMAIN || "";
const JWT_EXPIRATION_SECONDS = parseInt(process.env.JWT_EXPIRATION_TIME || "1800");

// Environment check
console.log("🔍 Environment check for ThirdwebAuthServer Simple");
console.log("🔍 hasPrivateKey:", !!process.env.THIRDWEB_ADMIN_PRIVATE_KEY);
console.log("🔍 hasClientId:", !!clientId);
console.log("🔍 hasDomain:", !!domain);
console.log("🔍 JWT_EXPIRATION_SECONDS:", JWT_EXPIRATION_SECONDS);

// Validate environment variables
if (!process.env.THIRDWEB_ADMIN_PRIVATE_KEY) {
  throw new Error("Missing THIRDWEB_ADMIN_PRIVATE_KEY");
}

if (!clientId) {
  throw new Error("Missing VITE_THIRDWEB_CLIENT_ID");
}

if (!domain) {
  throw new Error("Missing VITE_THIRDWEB_AUTH_DOMAIN");
}

const client = createThirdwebClient({
  clientId: clientId,
});

console.log("✅ Thirdweb client created");

const adminAccount = privateKeyToAccount({ client, privateKey });
console.log("✅ Admin account created");

const thirdwebAuth = createAuth({
  domain: domain,
  adminAccount: adminAccount,
  jwt: {
    expirationTimeSeconds: JWT_EXPIRATION_SECONDS,
  },
});

console.log("✅ ThirdwebAuth created successfully");

export { thirdwebAuth, client, JWT_EXPIRATION_SECONDS };


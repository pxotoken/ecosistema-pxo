import { createThirdwebClient } from "thirdweb";

let clientInstance = null;
let serverInstance = null;

const getThirdwebClient = () => {
  if (!clientInstance && process.env.VITE_THIRDWEB_CLIENT_ID) {
    clientInstance = createThirdwebClient({
      clientId: process.env.VITE_THIRDWEB_CLIENT_ID,
    });
  }

  return clientInstance;
};

const getServerThirdwebClient = () => {
  if (!serverInstance && process.env.THIRDWEB_SECRET_KEY) {
    serverInstance = createThirdwebClient({
      secretKey: process.env.THIRDWEB_SECRET_KEY,
    });
  }

  return serverInstance;
};

export { getThirdwebClient, getServerThirdwebClient };

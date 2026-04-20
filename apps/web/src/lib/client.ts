import { createThirdwebClient } from "thirdweb";

let clientInstance: any = null;
let serverInstance: any = null;

const getThirdwebClient = () => {
  if (!clientInstance && import.meta.env.VITE_THIRDWEB_CLIENT_ID) {
    clientInstance = createThirdwebClient({
      clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID as string,
    });
  }

  return clientInstance;
};

const getServerThirdwebClient = () => {
  if (!serverInstance && process.env.THIRDWEB_SECRET_KEY) {
    serverInstance = createThirdwebClient({
      secretKey: process.env.THIRDWEB_SECRET_KEY as string,
    });
  }

  return serverInstance;
};

export { getThirdwebClient, getServerThirdwebClient }; 
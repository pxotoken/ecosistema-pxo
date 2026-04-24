import { createThirdwebClient, type ThirdwebClient } from 'thirdweb';

let clientInstance: ThirdwebClient | null = null;

export function getThirdwebClient(): ThirdwebClient | null {
  if (!clientInstance && import.meta.env.VITE_THIRDWEB_CLIENT_ID) {
    clientInstance = createThirdwebClient({
      clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID as string,
    });
  }
  return clientInstance;
}

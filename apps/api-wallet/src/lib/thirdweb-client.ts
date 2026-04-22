import { createThirdwebClient, type ThirdwebClient } from 'thirdweb';
import { env } from '../config/env.js';

let serverInstance: ThirdwebClient | null = null;

export function getServerThirdwebClient(): ThirdwebClient | null {
  if (!serverInstance && env.THIRDWEB_SECRET_KEY) {
    serverInstance = createThirdwebClient({ secretKey: env.THIRDWEB_SECRET_KEY });
  }
  return serverInstance;
}

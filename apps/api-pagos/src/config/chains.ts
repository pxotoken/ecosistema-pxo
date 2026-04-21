import { env } from './env.js';

export const POLYGON_AMOY_CHAIN_ID = 80002;

export const POLYGON_AMOY_CONFIG = {
  chainId: POLYGON_AMOY_CHAIN_ID,
  name: 'Polygon Amoy Testnet',
  rpcUrl: env.ALCHEMY_API_KEY
    ? `https://polygon-amoy.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
    : 'https://rpc-amoy.polygon.technology',
  blockExplorerUrl: 'https://amoy.polygonscan.com',
  pxoDecimals: 6,
  avgBlockTimeMs: 2000,
} as const;

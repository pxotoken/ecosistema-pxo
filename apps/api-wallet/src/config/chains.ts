import { env } from './env.js';

export const POLYGON_MAINNET_ID = 137 as const;
export const POLYGON_AMOY_ID = 80002 as const;

export type SupportedChainId = typeof POLYGON_MAINNET_ID | typeof POLYGON_AMOY_ID;

export const ALCHEMY_HOST_BY_CHAIN: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: 'polygon-mainnet.g.alchemy.com',
  [POLYGON_AMOY_ID]: 'polygon-amoy.g.alchemy.com',
};

export const PXO_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: env.PXO_TOKEN_ADDRESS_MAINNET,
  [POLYGON_AMOY_ID]: env.PXO_TOKEN_ADDRESS_TESTNET,
};

export const USDC_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  [POLYGON_AMOY_ID]: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
};

export function toSupportedChainId(raw: unknown): SupportedChainId {
  return String(raw) === String(POLYGON_MAINNET_ID) ? POLYGON_MAINNET_ID : POLYGON_AMOY_ID;
}

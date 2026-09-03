import { env } from './env.js';

export const POLYGON_MAINNET_ID = 137 as const;
export const POLYGON_AMOY_ID = 80002 as const;

export type SupportedChainId = typeof POLYGON_MAINNET_ID | typeof POLYGON_AMOY_ID;

// A second chain-id type used to exist here, widening the one above with
// chain 56. That chain was dropped on 2026-09-02 (Polygon only this phase),
// which made the two identical — so it was deleted rather than kept as a
// synonym that invites the two sets to drift apart again.

export const PXO_SELL_SUPPORTED_CHAIN_IDS: readonly SupportedChainId[] = [
  POLYGON_MAINNET_ID,
  POLYGON_AMOY_ID,
];

export const PXO_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: env.PXO_TOKEN_ADDRESS_MAINNET,
  [POLYGON_AMOY_ID]: env.PXO_TOKEN_ADDRESS_TESTNET,
};

export const USDC_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  [POLYGON_AMOY_ID]: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
};

export const USDT_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  [POLYGON_AMOY_ID]: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
};

// Token map used by gas-subsidy.
export const STABLECOIN_CONTRACTS: Record<SupportedChainId, { USDC: string; USDT: string }> = {
  [POLYGON_MAINNET_ID]: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  [POLYGON_AMOY_ID]: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    USDT: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  },
};

export const PXO_RECEIVER_ADDRESSES: Record<SupportedChainId, string> = {
  [POLYGON_MAINNET_ID]: env.POLYGON_PXO_RECEIVER_ADDRESS,
  [POLYGON_AMOY_ID]: env.POLYGON_AMOY_PXO_RECEIVER_ADDRESS,
};

export const DEFAULT_TOKEN_TYPE: Record<SupportedChainId, 'USDC' | 'USDT'> = {
  [POLYGON_MAINNET_ID]: (env.POLYGON_DEFAULT_TOKEN as 'USDC' | 'USDT') || 'USDC',
  [POLYGON_AMOY_ID]: (env.POLYGON_AMOY_DEFAULT_TOKEN as 'USDC' | 'USDT') || 'USDC',
};

// Verified on-chain 2026-09-03 by calling decimals() on each deployment.
// Amoy was recorded as 18 here and is actually 8 — it is a separately
// deployed contract, not a mirror of mainnet, so the two differ.
export const PXO_DECIMALS: Record<SupportedChainId, number> = {
  [POLYGON_MAINNET_ID]: 6,
  [POLYGON_AMOY_ID]: 8,
};

export const STABLE_DECIMALS = 6;

// Single source of truth lives in @pxo/shared so the web app's client sell can
// share it too. Re-exported here for the local server call sites.
export { TOKEN_TRANSFER_GAS_LIMIT } from '@pxo/shared/consts';

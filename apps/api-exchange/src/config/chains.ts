import { env } from './env.js';

export const POLYGON_MAINNET_ID = 137 as const;
export const POLYGON_AMOY_ID = 80002 as const;
export const BSC_ID = 56 as const;

export type SupportedChainId = typeof POLYGON_MAINNET_ID | typeof POLYGON_AMOY_ID;
export type GasSubsidyChainId = SupportedChainId | typeof BSC_ID;

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

// Token map used by gas-subsidy (includes BSC).
export const STABLECOIN_CONTRACTS: Record<GasSubsidyChainId, { USDC: string; USDT: string }> = {
  [POLYGON_MAINNET_ID]: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  [POLYGON_AMOY_ID]: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    USDT: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  },
  [BSC_ID]: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
};

export const PXO_RECEIVER_ADDRESSES: Record<GasSubsidyChainId, string> = {
  [POLYGON_MAINNET_ID]:
    env.POLYGON_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
  [POLYGON_AMOY_ID]:
    env.POLYGON_AMOY_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
  [BSC_ID]: env.BSC_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
};

export const DEFAULT_TOKEN_TYPE: Record<GasSubsidyChainId, 'USDC' | 'USDT'> = {
  [POLYGON_MAINNET_ID]: (env.POLYGON_DEFAULT_TOKEN as 'USDC' | 'USDT') || 'USDC',
  [POLYGON_AMOY_ID]: (env.POLYGON_AMOY_DEFAULT_TOKEN as 'USDC' | 'USDT') || 'USDC',
  [BSC_ID]: (env.BSC_DEFAULT_TOKEN as 'USDC' | 'USDT') || 'USDC',
};

export const PXO_DECIMALS: Record<SupportedChainId, number> = {
  [POLYGON_MAINNET_ID]: 6,
  [POLYGON_AMOY_ID]: 18,
};

export const STABLE_DECIMALS = 6;

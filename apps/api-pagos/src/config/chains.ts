import { env } from './env.js';

export const POLYGON_MAINNET_ID = 137 as const;
export const POLYGON_AMOY_ID = 80002 as const;

// BNB Smart Chain (56) was supported here until 2026-09-02. Dropped per the
// chain-scope decision: Polygon only for this phase.
export type PaymentsChainId = typeof POLYGON_MAINNET_ID | typeof POLYGON_AMOY_ID;

export interface ChainConfig {
  chainId: PaymentsChainId;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  pxoDecimals: number;
  pxoTokenAddress: string;
  avgBlockTimeMs: number;
}

function amoyRpc(): string {
  return env.ALCHEMY_API_KEY
    ? `https://polygon-amoy.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
    : 'https://rpc-amoy.polygon.technology';
}

function polygonMainnetRpc(): string {
  if (env.POLYGON_MAINNET_RPC_URL) return env.POLYGON_MAINNET_RPC_URL;
  return env.ALCHEMY_API_KEY
    ? `https://polygon-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
    : 'https://polygon-rpc.com';
}

const CHAINS: Record<PaymentsChainId, () => ChainConfig> = {
  [POLYGON_MAINNET_ID]: () => ({
    chainId: POLYGON_MAINNET_ID,
    name: 'Polygon',
    rpcUrl: polygonMainnetRpc(),
    blockExplorerUrl: 'https://polygonscan.com',
    pxoDecimals: 6,
    pxoTokenAddress: env.PXO_TOKEN_ADDRESS_MAINNET,
    avgBlockTimeMs: 2_000,
  }),
  [POLYGON_AMOY_ID]: () => ({
    chainId: POLYGON_AMOY_ID,
    // DF-POSBlokko canonicalizes PXO to 6 decimals on every chain (1 PXO =
    // 1,000,000 base units = 1 MXN). Older legacy code declared 18 for Amoy;
    // that is incompatible with the shared `payments.amount_pxo` schema and
    // with the DF, so we align to 6.
    name: 'Polygon Amoy Testnet',
    rpcUrl: amoyRpc(),
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    pxoDecimals: 6,
    pxoTokenAddress: env.PXO_TOKEN_ADDRESS_TESTNET,
    avgBlockTimeMs: 2_000,
  }),
};

export function isSupportedChainId(id: number): id is PaymentsChainId {
  return id === POLYGON_MAINNET_ID || id === POLYGON_AMOY_ID;
}

export function getChainConfig(chainId: number = env.PAYMENTS_CHAIN_ID): ChainConfig {
  if (!isSupportedChainId(chainId)) {
    throw new Error(`Unsupported chainId ${chainId}. Supported: 137, 80002`);
  }
  return CHAINS[chainId]();
}

export function getActiveChain(): ChainConfig {
  return getChainConfig(env.PAYMENTS_CHAIN_ID);
}

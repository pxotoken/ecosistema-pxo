import { bsc, polygon, polygonAmoy } from 'thirdweb/chains';
import type { Chain } from 'thirdweb';

import { toChecksumAddress } from '../lib/evmAddress';

export const USE_MOCK_DATA = import.meta.env.VITE_MOCK_DATA === 'true';

// API base for the payments backend.
// Empty = same-origin: requests go through Vite's proxy (required on HTTPS
// dev because the browser blocks cross-origin http:// fetches as mixed
// content). Set an absolute URL only to bypass the proxy.
export const API_BASE_URL = (import.meta.env.VITE_PAYMENTS_API_URL as string | undefined) || '';

// If true, shows the POS (merchant) mode screen — lets an operator ingest an
// MXN amount and generate a dynamic QR via POST /v1/payments/generate.
// If false, the app runs only in wallet (client) mode.
export const POS_MODE_ENABLED = import.meta.env.VITE_POS_MODE_ENABLED === 'true';

// POS credentials (only used when POS_MODE_ENABLED=true).
export const POS_API_KEY = (import.meta.env.VITE_POS_API_KEY as string | undefined) || '';
export const POS_MERCHANT_ID =
  (import.meta.env.VITE_POS_MERCHANT_ID as string | undefined) || '';
export const POS_POS_ID = (import.meta.env.VITE_POS_POS_ID as string | undefined) || '';

// --- Chain + token del cliente (para QR Receive EIP-681) ---
export const PAYMENTS_CHAIN_ID =
  Number(import.meta.env.VITE_PAYMENTS_CHAIN_ID) || 80002;

console.log('[pagos env]', {
  VITE_PAYMENTS_CHAIN_ID: import.meta.env.VITE_PAYMENTS_CHAIN_ID,
  PAYMENTS_CHAIN_ID,
  PXO_TOKEN_ADDRESS_MAINNET: import.meta.env.VITE_PXO_TOKEN_ADDRESS_MAINNET,
});

export const PXO_TOKEN_ADDRESSES: Record<number, string> = {
  137:
    (import.meta.env.VITE_PXO_TOKEN_ADDRESS_MAINNET as string | undefined) ||
    '0xd6f9c21a585e2d77b62ec8c65ab9bec70e2b77d7',
  80002:
    (import.meta.env.VITE_PXO_TOKEN_ADDRESS_TESTNET as string | undefined) ||
    '0xeda62cd0d29e077b98e0b61d905c4af906d8946c',
  56: (import.meta.env.VITE_PXO_TOKEN_ADDRESS_BSC as string | undefined) || '',
};

/** Base units per 1 PXO — aligned with apps/api-pagos `pxoDecimals` (6). */
export const PXO_DECIMALS = 6;

function checksumTokenAddress(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  try {
    return toChecksumAddress(t);
  } catch {
    return '';
  }
}

export function getPxoTokenAddress(chainId: number = PAYMENTS_CHAIN_ID): string {
  const raw = PXO_TOKEN_ADDRESSES[chainId] ?? '';
  return checksumTokenAddress(raw);
}

export function getChainForId(chainId: number): Chain | null {
  if (chainId === 137) return polygon;
  if (chainId === 80002) return polygonAmoy;
  if (chainId === 56) return bsc;
  return null;
}

export function getPaymentsChain(): Chain {
  return getChainForId(PAYMENTS_CHAIN_ID) ?? polygonAmoy;
}

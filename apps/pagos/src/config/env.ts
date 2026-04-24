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

export const PXO_TOKEN_ADDRESSES: Record<number, string> = {
  137: (import.meta.env.VITE_PXO_TOKEN_ADDRESS_MAINNET as string | undefined) || '',
  80002: (import.meta.env.VITE_PXO_TOKEN_ADDRESS_TESTNET as string | undefined) || '',
  56: (import.meta.env.VITE_PXO_TOKEN_ADDRESS_BSC as string | undefined) || '',
};

export function getPxoTokenAddress(chainId: number = PAYMENTS_CHAIN_ID): string {
  return PXO_TOKEN_ADDRESSES[chainId] ?? '';
}

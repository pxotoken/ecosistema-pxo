import { getChainConfig } from '../config/chains.js';

export interface EIP681Params {
  contractAddress: string;
  merchantWallet: string;
  amountPXO: string;
  label?: string;
  paymentId: string;
  chainId?: number;
}

/**
 * Build an EIP-681 URI describing an ERC-20 transfer on a specific chain.
 * Compatible with Thirdweb In-App Wallet, MetaMask mobile, Trust Wallet.
 *
 * Format:
 *   ethereum:<contract>@<chainId>/transfer?address=<to>&uint256=<amount>&label=<label>&paymentId=<id>
 */
export function buildEIP681Uri(params: EIP681Params): string {
  const chainId = params.chainId ?? getChainConfig().chainId;
  const { contractAddress, merchantWallet, amountPXO, label, paymentId } = params;

  const parts = [
    `ethereum:${contractAddress}@${chainId}/transfer`,
    `?address=${merchantWallet}`,
    `&uint256=${amountPXO}`,
  ];
  if (label) parts.push(`&label=${encodeURIComponent(label)}`);
  parts.push(`&paymentId=${paymentId}`);

  return parts.join('');
}

/**
 * Parse an EIP-681 URI back into its components. Returns null if the URI is
 * not a valid EIP-681 transfer call we recognise. Used by the wallet client
 * (apps/pagos) to extract paymentId after scanning the QR.
 */
export interface ParsedEIP681 {
  contractAddress: string;
  chainId: number;
  merchantWallet: string;
  amountPXO: string;
  label: string | null;
  paymentId: string | null;
}

export function parseEIP681Uri(uri: string): ParsedEIP681 | null {
  const match = uri.match(/^ethereum:(0x[a-fA-F0-9]{40})@(\d+)\/transfer\?(.*)$/);
  if (!match) return null;

  const [, contractAddress, chainIdStr, qs] = match;
  const params = new URLSearchParams(qs);

  const merchantWallet = params.get('address');
  const amountPXO = params.get('uint256');
  if (!merchantWallet || !amountPXO) return null;

  return {
    contractAddress,
    chainId: Number(chainIdStr),
    merchantWallet,
    amountPXO,
    label: params.get('label'),
    paymentId: params.get('paymentId'),
  };
}

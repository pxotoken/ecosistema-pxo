import { POLYGON_AMOY_CHAIN_ID } from '../config/chains.js';

export interface EIP681Params {
  contractAddress: string;
  merchantWallet: string;
  amountPXO: string;
  label?: string;
  paymentId: string;
}

export function buildEIP681Uri(params: EIP681Params): string {
  // TODO: Build EIP-681 URI for ERC-20 token transfer on Polygon Amoy
  // Format: ethereum:{contractAddress}@{chainId}/transfer?address={to}&uint256={amount}&label={label}&paymentId={paymentId}
  const { contractAddress, merchantWallet, amountPXO, label, paymentId } = params;
  return [
    `ethereum:${contractAddress}@${POLYGON_AMOY_CHAIN_ID}/transfer`,
    `?address=${merchantWallet}`,
    `&uint256=${amountPXO}`,
    label ? `&label=${encodeURIComponent(label)}` : '',
    `&paymentId=${paymentId}`,
  ].join('');
}

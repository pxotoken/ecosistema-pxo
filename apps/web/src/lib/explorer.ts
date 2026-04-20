import { CHAIN_IDS } from '../config/chains';

export function getExplorerTxUrl(chainId: number | undefined, hash: string): string {
  if (chainId === CHAIN_IDS.POLYGON) return `https://polygonscan.com/tx/${hash}`;
  if (chainId === CHAIN_IDS.AMOY) return `https://amoy.polygonscan.com/tx/${hash}`;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

export function getExplorerTxUrlFromTx(
  tx: { chain_id?: number; txHash?: string },
  fallbackChainId?: number
): string {
  if (!tx.txHash) return '';
  return getExplorerTxUrl(tx.chain_id ?? fallbackChainId, tx.txHash);
}

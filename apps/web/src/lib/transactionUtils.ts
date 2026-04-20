import type { HistoryItem } from '@pxo/shared/types';
import { TransactionTypes } from '@pxo/shared/types';

/**
 * Filters out blockchain transactions that are already represented by an order (Buy/Sell).
 * Each order links to an input tx (e.g. USDC Send) and output tx (e.g. PXO Receive) —
 * those raw blockchain entries are redundant when the order itself is shown.
 */
export function formatAmount(amount: number | undefined | null): string {
  if (typeof amount !== 'number') return '0';
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function deduplicateBlockchainTxs(
  orders: HistoryItem[],
  blockchainTxs: HistoryItem[]
): HistoryItem[] {
  const orderHashes = new Set<string>();

  orders.forEach(tx => {
    if (tx.type === TransactionTypes.BUY || tx.type === TransactionTypes.SELL) {
      if (tx.txHash) orderHashes.add(tx.txHash.toLowerCase());
      if (tx.pxoTxHash) orderHashes.add(tx.pxoTxHash.toLowerCase());
    }
  });

  return blockchainTxs.filter(
    tx => !tx.txHash || !orderHashes.has(tx.txHash.toLowerCase())
  );
}

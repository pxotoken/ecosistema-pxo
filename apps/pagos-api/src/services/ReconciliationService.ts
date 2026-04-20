export class ReconciliationService {
  async reconcilePendingPayments(): Promise<{ reconciled: number; expired: number }> {
    // TODO: Periodic on-chain reconciliation
    // Check PENDING payments against Polygon Amoy receipts (eth_getTransactionReceipt)
    // Expire payments past TTL
    // Runs every 1 minute
    throw new Error('Not implemented');
  }
}

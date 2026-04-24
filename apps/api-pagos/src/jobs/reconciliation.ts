import type { ReconciliationService } from '../services/ReconciliationService.js';
import type { WorkerHandle } from './expirationWorker.js';

/**
 * Periodic on-chain reconciliation for payments with a known txHash but no
 * webhook confirmation yet (e.g. QuickNode delayed or down).
 * Default interval = 60s (env: RECONCILIATION_WORKER_INTERVAL_MS).
 */
export function startReconciliationWorker(
  reconciliation: ReconciliationService,
  intervalMs: number,
  logger?: { info: (msg: string) => void; error: (msg: string) => void },
): WorkerHandle {
  const handle = setInterval(async () => {
    try {
      const { reconciled, expired } = await reconciliation.reconcilePendingPayments();
      if (reconciled > 0 || expired > 0) {
        logger?.info(
          `reconciliationWorker: reconciled=${reconciled} expired=${expired}`,
        );
      }
    } catch (err) {
      logger?.error(
        `reconciliationWorker error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, intervalMs);
  handle.unref();
  return { stop: () => clearInterval(handle) };
}

import type { PaymentService } from '../services/PaymentService.js';

export interface WorkerHandle {
  stop: () => void;
}

/**
 * Periodic sweep: mark PENDING payments past their TTL as EXPIRED.
 * Default interval = 30s (env: EXPIRATION_WORKER_INTERVAL_MS).
 */
export function startExpirationWorker(
  payments: PaymentService,
  intervalMs: number,
  logger?: { info: (msg: string) => void; error: (msg: string) => void },
): WorkerHandle {
  const handle = setInterval(async () => {
    try {
      const expired = await payments.expirePending();
      if (expired > 0) logger?.info(`expirationWorker: expired ${expired} payment(s)`);
    } catch (err) {
      logger?.error(
        `expirationWorker error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, intervalMs);
  handle.unref();
  return { stop: () => clearInterval(handle) };
}

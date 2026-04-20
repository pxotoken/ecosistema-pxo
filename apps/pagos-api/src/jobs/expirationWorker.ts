export function startExpirationWorker(_intervalMs: number = 60_000): void {
  // TODO: Periodic job to expire PENDING payments past TTL (5 min)
  // setInterval → PaymentService.expirePending()
}

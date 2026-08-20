/**
 * Graceful shutdown for Fastify HTTP services.
 *
 * On SIGTERM/SIGINT (e.g. Railway killing the old instance during a deploy),
 * stop background workers, then drain in-flight HTTP requests via the server's
 * `close()` before exiting. Without this the process is killed mid-request,
 * which surfaces to clients (and the orchestrator proxy) as dropped
 * connections / 502s.
 *
 * Typed structurally so @pxo/shared needs no `fastify` dependency — any object
 * exposing `close()` and a `log` compatible with pino satisfies it.
 */
export interface ClosableServer {
  close: () => Promise<unknown>;
  log: {
    info: (msg: string) => void;
    error: (obj: unknown, msg?: string) => void;
  };
}

export interface GracefulShutdownOptions {
  /**
   * Called before the HTTP server drains — use to stop interval-based workers
   * so no new work starts while shutting down. Run in order; may be async.
   */
  onShutdown?: Array<() => void | Promise<void>>;
  /** Signals to trap. Defaults to SIGTERM and SIGINT. */
  signals?: NodeJS.Signals[];
}

export function registerGracefulShutdown(
  server: ClosableServer,
  options: GracefulShutdownOptions = {},
): void {
  const signals = options.signals ?? ['SIGTERM', 'SIGINT'];
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      for (const stop of options.onShutdown ?? []) {
        await stop();
      }
      await server.close();
      process.exit(0);
    } catch (err) {
      server.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  for (const signal of signals) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}

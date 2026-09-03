/**
 * The PXO receiver address — the wallet users transfer PXO to when selling
 * or exchanging.
 *
 * This lives in one place on purpose. It previously existed as two verbatim
 * copies, in usePXOSell and usePXOExchange, and both defaulted to a
 * hardcoded literal when the environment variable was unset. Because
 * `VITE_*` values are baked into the bundle at build time, an unset variable
 * ships as `undefined` with no startup error — so production silently sent
 * real mainnet PXO to an address nobody had verified. See SL-001 in
 * docs/BACKLOG.md.
 *
 * Two rules follow from that, and both are the reason this module exists:
 *
 *   1. No fallback address, ever. A missing receiver must fail loudly.
 *   2. One definition. Duplicated config is how one copy gets fixed and the
 *      other silently keeps the old behaviour.
 */

/** Chains this app can transact on. BSC (56) was dropped — Polygon only. */
export const RECEIVER_CHAIN_IDS = [137, 80002] as const;
export type ReceiverChainId = (typeof RECEIVER_CHAIN_IDS)[number];

const PXO_RECEIVER_ADDRESSES: Record<number, string | undefined> = {
  137: import.meta.env.VITE_POLYGON_PXO_RECEIVER_ADDRESS,
  80002: import.meta.env.VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS,
};

const RECEIVER_ENV_VAR: Record<number, string> = {
  137: 'VITE_POLYGON_PXO_RECEIVER_ADDRESS',
  80002: 'VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS',
};

/**
 * Resolve the receiver for a chain, or throw.
 *
 * Throws rather than returning undefined so a caller cannot accidentally
 * build a transfer with an empty `to`. Earlier versions fell back to the
 * mainnet entry for any unrecognised chain, which meant an unsupported
 * chain was handed the mainnet receiver.
 */
export function getPXOReceiverAddress(chainId: number): string {
  const address = PXO_RECEIVER_ADDRESSES[chainId];
  if (address) return address;

  const varName = RECEIVER_ENV_VAR[chainId];
  throw new Error(
    varName
      ? `No PXO receiver address configured for chain ${chainId}. Set ${varName} and rebuild — Vite bakes this in at build time, so setting it without a redeploy has no effect.`
      : `No PXO receiver address configured for chain ${chainId}, and that chain is not supported.`,
  );
}

/** Non-throwing probe, for surfacing misconfiguration before a user acts. */
export function hasPXOReceiverAddress(chainId: number): boolean {
  return Boolean(PXO_RECEIVER_ADDRESSES[chainId]);
}

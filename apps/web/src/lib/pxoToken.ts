/**
 * The PXO token contract address per chain.
 *
 * Same reasoning as `pxoReceiver.ts`, and the same rules: no fallback address,
 * one definition. `VITE_*` values are baked in at build time, so an unset
 * variable ships as `undefined` with no startup error — which is how a
 * hardcoded fallback outlives the rotation it was supposed to survive (SL-001).
 *
 * Two copies of this map already exist, in `RedeemPxoToMxn.tsx` (empty-string
 * fallback) and `usePXOSell.ts` (hardcoded literal fallback). New call sites
 * use this module; those two should move over, which is a separate change
 * because `usePXOSell` currently works on an unset variable and would start
 * throwing.
 */

/** Chains this app can transact on. BSC (56) was dropped — Polygon only. */
export const PXO_TOKEN_CHAIN_IDS = [137, 80002] as const;
export type PxoTokenChainId = (typeof PXO_TOKEN_CHAIN_IDS)[number];

const PXO_TOKEN_ADDRESSES: Record<number, string | undefined> = {
  137: import.meta.env.VITE_PXO_TOKEN_ADDRESS_MAINNET,
  80002: import.meta.env.VITE_PXO_TOKEN_ADDRESS_TESTNET,
};

const TOKEN_ENV_VAR: Record<number, string> = {
  137: 'VITE_PXO_TOKEN_ADDRESS_MAINNET',
  80002: 'VITE_PXO_TOKEN_ADDRESS_TESTNET',
};

/**
 * Resolve the PXO token address for a chain, or throw.
 *
 * Throws rather than returning undefined so a caller cannot build a transfer
 * against an empty contract address.
 */
export function getPXOTokenAddress(chainId: number): string {
  const address = PXO_TOKEN_ADDRESSES[chainId];
  if (address) return address;

  const varName = TOKEN_ENV_VAR[chainId];
  throw new Error(
    varName
      ? `No PXO token address configured for chain ${chainId}. Set ${varName} and rebuild — Vite bakes this in at build time, so setting it without a redeploy has no effect.`
      : `No PXO token address configured for chain ${chainId}, and that chain is not supported.`,
  );
}

/** Non-throwing probe, for surfacing misconfiguration before a user acts. */
export function hasPXOTokenAddress(chainId: number): boolean {
  return Boolean(PXO_TOKEN_ADDRESSES[chainId]);
}

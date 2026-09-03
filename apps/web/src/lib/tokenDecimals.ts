import { decimals as readDecimals } from 'thirdweb/extensions/erc20';
import type { Chain, ThirdwebClient } from 'thirdweb';
import { getContract } from 'thirdweb/contract';

/**
 * Read an ERC-20's `decimals()` from the chain, cached per (chain, token).
 *
 * This replaces a hardcoded lookup table that was wrong for every PXO entry
 * it contained. Verified on-chain 2026-09-03:
 *
 *   PXO mainnet (0xd6f9c21a…7d7, Polygon)  decimals = 6   table said 18
 *   PXO Amoy    (0xeda62cd0…46c, Amoy)     decimals = 8   table said 18
 *
 * The Amoy value is worth noting: it is 8, matching neither the 18 the web
 * app assumed nor the 6 that api-pagos assumes. Three components each held a
 * different belief about the same token, which is the argument for not
 * holding the belief at all — the contract already knows.
 *
 * Throws rather than guessing. A wrong decimals value is silent and
 * corrupting; a failed read is loud and recoverable. Call sites that can
 * proceed without it should catch and omit the value, never substitute one.
 */

const cache = new Map<string, number>();

export async function getTokenDecimals(params: {
  client: ThirdwebClient;
  chain: Chain;
  address: string;
}): Promise<number> {
  const key = `${params.chain.id}:${params.address.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const contract = getContract({
    client: params.client,
    chain: params.chain,
    address: params.address as `0x${string}`,
  });
  const value = await readDecimals({ contract });
  cache.set(key, value);
  return value;
}

/** Exposed for tests. */
export function __clearTokenDecimalsCache(): void {
  cache.clear();
}

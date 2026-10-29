import { getContract, readContract } from 'thirdweb';
import type { ThirdwebClient, Chain } from 'thirdweb';
import { env } from '../config/env.js';

/**
 * How PXO reaches a buyer: moved from the operational wallet's balance, or
 * created.
 *
 *   transfer  always move existing balance; never create supply
 *   mint      always create; requires the minter role on-chain
 *   auto      move if the balance covers the whole order, otherwise create
 *             (the default when PXO_ISSUANCE_MODE is unset)
 *
 * `auto` mints the FULL order rather than topping up the shortfall: one
 * transaction instead of two, and no partial-fill state where the transfer
 * lands and the mint does not.
 *
 * The minter role is read from the chain rather than assumed from config.
 * That means granting it via addMinter() starts working on its own, with no
 * deploy and no env change — and if it is never granted, `auto` still serves
 * every order the balance can cover instead of failing outright.
 */
export type IssuanceMode = 'transfer' | 'mint' | 'auto';
export type IssuanceAction = 'transfer' | 'mint';

export function resolveIssuanceMode(): IssuanceMode {
  const raw = (env.PXO_ISSUANCE_MODE ?? '').trim().toLowerCase();
  if (raw === 'transfer' || raw === 'mint') return raw;
  if (raw === '' || raw === 'auto') return 'auto';
  // An unrecognised value must not silently pick a behaviour that moves money.
  throw new Error(
    `PXO_ISSUANCE_MODE="${env.PXO_ISSUANCE_MODE}" is not valid. Use "transfer", "mint", or leave it unset for auto.`,
  );
}

export class IssuanceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IssuanceUnavailableError';
  }
}

const fmt = (v: bigint, decimals: number): string => {
  const s = v.toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, -decimals) || '0';
  const frac = decimals ? '.' + s.slice(-decimals).replace(/0+$/, '') : '';
  return whole + (frac === '.' ? '' : frac);
};

/**
 * Pure decision: given the mode, what the wallet holds, and whether we hold
 * the minter role, decide how to issue — or refuse with a message that says
 * which of the two conditions failed.
 */
export function decideIssuance(params: {
  mode: IssuanceMode;
  balance: bigint;
  quantity: bigint;
  minterRole: boolean;
  decimals: number;
}): IssuanceAction {
  const { mode, balance, quantity, minterRole, decimals } = params;

  if (mode === 'transfer') {
    if (balance < quantity) {
      throw new IssuanceUnavailableError(
        `Insufficient PXO to fill this order: wallet holds ${fmt(balance, decimals)}, order needs ${fmt(quantity, decimals)}. ` +
          `PXO_ISSUANCE_MODE=transfer forbids minting; top up the wallet or switch to auto.`,
      );
    }
    return 'transfer';
  }

  if (mode === 'mint') {
    if (!minterRole) {
      throw new IssuanceUnavailableError(
        'PXO_ISSUANCE_MODE=mint but the operational wallet does not hold the minter role on the PXO contract. ' +
          'The contract owner must call addMinter(<operational wallet>).',
      );
    }
    return 'mint';
  }

  // auto
  if (balance >= quantity) return 'transfer';
  if (minterRole) return 'mint';
  throw new IssuanceUnavailableError(
    `Insufficient PXO to fill this order: wallet holds ${fmt(balance, decimals)}, order needs ${fmt(quantity, decimals)}. ` +
      'Minting is unavailable because the operational wallet does not hold the minter role — ' +
      'the contract owner must call addMinter(<operational wallet>), or the wallet needs topping up.',
  );
}

/**
 * isMinter(address) read from the contract, cached briefly.
 *
 * The TTL is the whole point: short enough that granting the role takes
 * effect within a minute without a restart, long enough that we are not
 * making an RPC call on every order.
 */
const MINTER_CACHE_TTL_MS = 60_000;
const minterCache = new Map<string, { value: boolean; at: number }>();

export async function hasMinterRole(params: {
  client: ThirdwebClient;
  chain: Chain;
  tokenAddress: string;
  account: string;
}): Promise<boolean> {
  const key = `${params.chain.id}:${params.tokenAddress.toLowerCase()}:${params.account.toLowerCase()}`;
  const hit = minterCache.get(key);
  if (hit && Date.now() - hit.at < MINTER_CACHE_TTL_MS) return hit.value;

  try {
    const contract = getContract({
      client: params.client,
      chain: params.chain,
      address: params.tokenAddress as `0x${string}`,
    });
    const value = await readContract({
      contract,
      method: 'function isMinter(address account) view returns (bool)',
      params: [params.account],
    });
    minterCache.set(key, { value: Boolean(value), at: Date.now() });
    return Boolean(value);
  } catch {
    // A failed read must not be mistaken for "we hold the role". Not cached,
    // so a transient RPC problem does not pin us to false for a minute.
    return false;
  }
}

/** Exposed for tests. */
export function __clearMinterCache(): void {
  minterCache.clear();
}

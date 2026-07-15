import { getServerSupabase } from './supabase.js';

export interface ExchangeUser {
  id: string;
  wallet_address: string;
  mail: string | null;
  kyc_status: string | null;
  CLABE: string | null;
}

/**
 * Resolve the user row by wallet address (wallet is case-insensitive on-chain
 * but stored verbatim in Supabase — we match with ilike to be safe).
 *
 * Both `KYC_status` and `CLABE` are quoted case-sensitive columns in the
 * legacy schema. We select them by their real names, then map to camel/lower
 * on the way out to match the rest of api-exchange's conventions.
 */
export async function getUserByWallet(walletAddress: string): Promise<ExchangeUser | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, wallet_address, mail, KYC_status, "CLABE"')
    .ilike('wallet_address', walletAddress)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up user: ${error.message}`);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: data.id,
    wallet_address: data.wallet_address,
    mail: data.mail ?? null,
    kyc_status: (row.KYC_status as string | null) ?? null,
    CLABE: (row.CLABE as string | null) ?? null,
  };
}

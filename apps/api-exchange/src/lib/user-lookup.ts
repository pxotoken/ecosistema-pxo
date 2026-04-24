import { getServerSupabase } from './supabase.js';

export interface ExchangeUser {
  id: string;
  wallet_address: string;
  mail: string | null;
  kyc_status: string | null;
}

/**
 * Resolve the user row by wallet address (wallet is case-insensitive on-chain
 * but stored verbatim in Supabase — we match with ilike to be safe).
 */
export async function getUserByWallet(walletAddress: string): Promise<ExchangeUser | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, wallet_address, mail, KYC_status')
    .ilike('wallet_address', walletAddress)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up user: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    wallet_address: data.wallet_address,
    mail: data.mail ?? null,
    kyc_status: (data as Record<string, unknown>).KYC_status as string | null,
  };
}

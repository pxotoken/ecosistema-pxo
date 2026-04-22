import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserRow {
  id: string;
  provider_id?: string | null;
  mail?: string | null;
  wallet_address?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
  country?: string | null;
  phone?: string | null;
  user_type?: string | null;
  KYC_status?: string | null;
  verificated?: boolean | null;
  last_access?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const PROFILE_COLUMNS =
  'id, provider_id, mail, wallet_address, first_name, last_name, profile_picture, country, phone, user_type, KYC_status, verificated, last_access, created_at, updated_at';

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  country?: string;
  phone?: string;
}

export class UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select(PROFILE_COLUMNS)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch user by id: ${error.message}`);
    }
    return data as UserRow;
  }

  async getByWalletAddress(walletAddress: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select(PROFILE_COLUMNS)
      .eq('wallet_address', walletAddress)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch user by wallet: ${error.message}`);
    }
    return data as UserRow;
  }

  async updateProfile(id: string, patch: UpdateProfileInput): Promise<UserRow> {
    const { data, error } = await this.supabase
      .from('users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data as UserRow;
  }

  async touchLastAccess(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ last_access: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update last_access: ${error.message}`);
  }
}

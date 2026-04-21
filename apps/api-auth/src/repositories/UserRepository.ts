import type { SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  provider_id?: string | null;
  mail?: string | null;
  wallet_address?: string | null;
  KYC_status?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
  country?: string | null;
  last_access?: string | null;
  user_type?: string[] | null;
  auth_provider?: string | null;
  auth_provider_class?: string | null;
  [k: string]: unknown;
}

export interface CreateUserInput {
  provider_id?: string;
  mail?: string;
  wallet_address?: string;
  KYC_status?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  country?: string;
}

export interface UpdateUserInput {
  id: string;
  [k: string]: unknown;
}

export class UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createUser(userData: CreateUserInput): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([
        {
          provider_id: userData.provider_id,
          mail: userData.mail,
          wallet_address: userData.wallet_address,
          KYC_status: userData.KYC_status || 'PENDING',
          first_name: userData.first_name,
          last_name: userData.last_name,
          profile_picture: userData.profile_picture,
          country: userData.country,
          last_access: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data as User;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase.from('users').select('*').eq('mail', email).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    return data as User;
  }

  async updateUser(userData: UpdateUserInput): Promise<User> {
    const { id, ...rest } = userData;
    const { data, error } = await this.supabase
      .from('users')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return data as User;
  }

  async updateLastAccess(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ last_access: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw new Error(`Failed to update last access: ${error.message}`);
  }
}

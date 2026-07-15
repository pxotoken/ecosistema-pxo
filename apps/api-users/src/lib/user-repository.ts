import type { SupabaseClient } from '@supabase/supabase-js';

export class ClabeConflictError extends Error {
  constructor() {
    super('CLABE is already registered');
    this.name = 'ClabeConflictError';
  }
}

export class ClabeLockedError extends Error {
  constructor() {
    super('CLABE cannot be changed while a deposit intent is active');
    this.name = 'ClabeLockedError';
  }
}

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
  CLABE?: string | null;
  verificated?: boolean | null;
  last_access?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const PROFILE_COLUMNS =
  'id, provider_id, mail, wallet_address, first_name, last_name, profile_picture, country, phone, user_type, KYC_status, "CLABE", verificated, last_access, created_at, updated_at';

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  country?: string;
  phone?: string;
  CLABE?: string;
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
    if (error) {
      // Postgres 23505 = unique_violation. Only the CLABE index can trigger
      // this on a profile update (other unique columns aren't in the patch shape).
      if (error.code === '23505' && /clabe/i.test(error.message)) {
        throw new ClabeConflictError();
      }
      throw new Error(`Failed to update profile: ${error.message}`);
    }
    return data as UserRow;
  }

  /**
   * True if the user has any deposit_intent in a state that would be
   * disrupted by changing the source CLABE. PENDING and MATCHED both count:
   * a PENDING intent expects the funding to arrive from the CLABE snapshot
   * on the intent, and MATCHED means the worker has claimed a funding but
   * hasn't yet completed the PXO transfer.
   */
  async hasActiveDepositIntent(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('deposit_intents')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['PENDING', 'MATCHED'])
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to check active deposit intents: ${error.message}`);
    }
    return Boolean(data);
  }

  async touchLastAccess(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ last_access: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update last_access: ${error.message}`);
  }

  async listPaginated(params: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ users: UserRow[]; total: number }> {
    const { search, limit, offset } = params;

    let query = this.supabase
      .from('users')
      .select(PROFILE_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      const term = search.replace(/[,()]/g, '');
      query = query.or(
        `mail.ilike.%${term}%,wallet_address.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`,
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list users: ${error.message}`);

    return { users: (data ?? []) as UserRow[], total: count ?? 0 };
  }

  async updateUserType(id: string, userType: string | null): Promise<UserRow> {
    const { data, error } = await this.supabase
      .from('users')
      .update({ user_type: userType, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw new Error(`Failed to update user_type: ${error.message}`);
    return data as UserRow;
  }
}

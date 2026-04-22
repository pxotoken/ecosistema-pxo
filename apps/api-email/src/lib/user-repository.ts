import type { SupabaseClient } from '@supabase/supabase-js';

export interface ActiveUser {
  id: string;
  mail: string;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Minimal user reader for broadcast use case only.
 * When api-users domain is extracted, this should call it via HTTP.
 */
export class UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAllActiveUsers(): Promise<ActiveUser[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, mail, first_name, last_name')
      .eq('verificated', true)
      .not('mail', 'is', null);

    if (error) throw new Error(`Failed to fetch active users: ${error.message}`);
    return (data ?? []) as ActiveUser[];
  }
}

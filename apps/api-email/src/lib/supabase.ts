import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let client: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (!env.SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error('Missing SUPABASE_SECRET_KEY');
  }
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Merchant, POSDevice } from '../types/merchant.js';

interface MerchantRow {
  id: string;
  name: string;
  wallet_address: string;
  kyb_status: Merchant['kybStatus'];
  callback_url: string | null;
  api_key_hash: string;
  is_active: boolean;
  created_at: string;
}

interface POSDeviceRow {
  id: string;
  merchant_id: string;
  label: string;
  is_active: boolean;
  last_seen_at: string | null;
}

function rowToMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    name: row.name,
    walletAddress: row.wallet_address,
    kybStatus: row.kyb_status,
    callbackUrl: row.callback_url ?? undefined,
    apiKeyHash: row.api_key_hash,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}

function rowToPOSDevice(row: POSDeviceRow): POSDevice {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    label: row.label,
    isActive: row.is_active,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : undefined,
  };
}

export class MerchantRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(merchantId: string): Promise<Merchant | null> {
    const { data, error } = await this.supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch merchant: ${error.message}`);
    return data ? rowToMerchant(data as MerchantRow) : null;
  }

  async findPos(posId: string, merchantId: string): Promise<POSDevice | null> {
    const { data, error } = await this.supabase
      .from('pos_devices')
      .select('*')
      .eq('id', posId)
      .eq('merchant_id', merchantId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch POS device: ${error.message}`);
    return data ? rowToPOSDevice(data as POSDeviceRow) : null;
  }

  async touchPosLastSeen(posId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pos_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', posId);
    if (error) {
      // Non-fatal — best-effort telemetry.
      console.warn(`touchPosLastSeen failed for ${posId}: ${error.message}`);
    }
  }
}

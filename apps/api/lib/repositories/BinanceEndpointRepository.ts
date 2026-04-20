/**
 * Binance Endpoint Repository
 * Manages CRUD operations for binance_endpoints table
 */

import { supabase } from '../supabase.js';
import type { UpdateEndpointStatus } from '@pxo/shared/types/binance';

export class BinanceEndpointRepository {
  /**
   * Update or insert endpoint status (upsert)
   */
  static async upsertStatus(params: UpdateEndpointStatus): Promise<void> {
    const upsertData = {
      name: params.name,
      url: params.url,
      method: params.method,
      status: params.status,
      last_tested: params.last_tested || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('binance_endpoints')
      .upsert(upsertData, { onConflict: 'name' });

    if (error) {
      console.error(`Error upserting endpoint ${params.name}:`, error);
      throw error;
    }

    console.log(`✅ Endpoint ${params.name} upserted: ${params.status}`);
  }
}

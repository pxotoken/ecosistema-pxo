import type { Merchant, POSDevice } from '../types/merchant.js';

export class MerchantService {
  async getById(_merchantId: string): Promise<Merchant | null> {
    // TODO: Fetch merchant by ID from Supabase
    throw new Error('Not implemented');
  }

  async validatePOS(_posId: string, _merchantId: string): Promise<POSDevice | null> {
    // TODO: Validate POS belongs to merchant and is active
    throw new Error('Not implemented');
  }

  async validateAPIKey(_apiKey: string, _merchantId: string): Promise<boolean> {
    // TODO: Validate API key hash against stored hash
    throw new Error('Not implemented');
  }
}

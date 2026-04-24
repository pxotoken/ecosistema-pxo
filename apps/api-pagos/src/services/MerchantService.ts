import crypto from 'node:crypto';
import { MerchantRepository } from '../models/Merchant.js';
import type { Merchant, POSDevice } from '../types/merchant.js';

/**
 * Hash an API key the way we persist it in merchants.api_key_hash.
 * Dev note: SHA-256 of a high-entropy UUID key is fine for dev. Prod should
 * migrate to bcrypt/argon2 with a server-side pepper (deuda documentada).
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
}

export interface MerchantAuthContext {
  merchant: Merchant;
  pos: POSDevice;
}

export class MerchantService {
  constructor(private readonly repo: MerchantRepository) {}

  async getById(merchantId: string): Promise<Merchant | null> {
    return this.repo.findById(merchantId);
  }

  async validatePos(posId: string, merchantId: string): Promise<POSDevice | null> {
    const pos = await this.repo.findPos(posId, merchantId);
    if (!pos || !pos.isActive) return null;
    return pos;
  }

  /**
   * Verify an API key + POS context. Returns the merchant and POS on success,
   * or an error code meant to be mapped to an HTTP status by the caller.
   */
  async authenticate(params: {
    apiKey: string;
    merchantId: string;
    posId: string;
  }): Promise<
    | { ok: true; context: MerchantAuthContext }
    | { ok: false; code: 'INVALID_MERCHANT' | 'INVALID_API_KEY' | 'MERCHANT_SUSPENDED' | 'KYB_REQUIRED' | 'INVALID_POS' }
  > {
    const merchant = await this.repo.findById(params.merchantId);
    if (!merchant) return { ok: false, code: 'INVALID_MERCHANT' };
    if (!merchant.isActive) return { ok: false, code: 'MERCHANT_SUSPENDED' };
    if (merchant.kybStatus !== 'VERIFIED') return { ok: false, code: 'KYB_REQUIRED' };

    const candidateHash = hashApiKey(params.apiKey);
    if (!timingSafeEqualHex(candidateHash, merchant.apiKeyHash)) {
      return { ok: false, code: 'INVALID_API_KEY' };
    }

    const pos = await this.validatePos(params.posId, params.merchantId);
    if (!pos) return { ok: false, code: 'INVALID_POS' };

    // Fire-and-forget heartbeat.
    void this.repo.touchPosLastSeen(pos.id);

    return { ok: true, context: { merchant, pos } };
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

import type { BuyPriceResult, SellPriceResult } from './types.js';

export interface CachedPrice {
  buy: number;
  sell: number;
  basePrice: number;
  timestamp: number;
  pair: string;
}

export class PriceCache {
  private cache = new Map<string, CachedPrice>();
  private readonly TTL = 5000;

  get(pair: string): CachedPrice | null {
    const cached = this.cache.get(pair);
    if (!cached) return null;
    if (this.isExpired(cached)) {
      this.cache.delete(pair);
      return null;
    }
    return cached;
  }

  set(buyPrice: BuyPriceResult, sellPrice: SellPriceResult): void {
    const cached: CachedPrice = {
      buy: buyPrice.price,
      sell: sellPrice.price,
      basePrice: buyPrice.basePrice,
      timestamp: Date.now(),
      pair: buyPrice.pair,
    };
    this.cache.set(buyPrice.pair, cached);
  }

  private isExpired(cached: CachedPrice): boolean {
    return Date.now() - cached.timestamp >= this.TTL;
  }

  clear(pair?: string): void {
    if (pair) this.cache.delete(pair);
    else this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const priceCache = new PriceCache();

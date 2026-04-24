import type { PriceProviderResult } from '../types.js';

export interface IPriceProvider {
  getPrice(symbol: string): Promise<PriceProviderResult>;
}

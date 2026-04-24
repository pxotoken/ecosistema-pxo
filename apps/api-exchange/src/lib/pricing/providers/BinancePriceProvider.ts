import { env } from '../../../config/env.js';
import type { IPriceProvider } from './PriceProvider.js';
import type { PriceProviderResult } from '../types.js';

interface BinancePriceResponse {
  symbol: string;
  price: string;
}

export class BinancePriceProvider implements IPriceProvider {
  async getPrice(symbol: string): Promise<PriceProviderResult> {
    const url = `${env.BINANCE_API_BASE_URL}/ticker/price?symbol=${encodeURIComponent(symbol)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance ticker/price failed for ${symbol}: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as BinancePriceResponse;
    return {
      price: parseFloat(data.price),
      symbol: data.symbol,
      timestamp: Date.now(),
    };
  }
}

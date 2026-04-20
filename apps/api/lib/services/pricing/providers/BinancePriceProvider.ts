import { getCurrentPrice } from '../../external/BinanceService.js';
import type { IPriceProvider } from './PriceProvider.js';
import type { PriceProviderResult } from '../types.js';

export class BinancePriceProvider implements IPriceProvider {
  async getPrice(symbol: string): Promise<PriceProviderResult> {
    const priceData = await getCurrentPrice(symbol);
    
    return {
      price: priceData.price,
      symbol: priceData.symbol,
      timestamp: priceData.timestamp,
    };
  }
}


import { getServerSupabase } from '../../supabase.js';
import type { IPriceProvider } from './providers/PriceProvider.js';
import type { PricingRule, BuyPriceResult, SellPriceResult, PriceProviderResult } from './types.js';
import { priceCache } from './PriceCache.js';

export class PricingService {
  constructor(private priceProvider: IPriceProvider) {}

  private mapPXOToMXN(pair: string): string {
    const upperPair = pair.toUpperCase();
    
    if (upperPair.includes('PXO')) {
      const parts = upperPair.split('/');
      if (parts.length === 2) {
        const [base, quote] = parts;
        
        if (base === 'PXO') {
          return `MXN${quote}`;
        } else if (quote === 'PXO') {
          return `${base}MXN`;
        }
      }
    }
    
    return pair;
  }

  private needsIndirectConversion(pair: string): boolean {
    const upperPair = pair.toUpperCase();
    return upperPair === 'USDCMXN' || upperPair === 'MXNUSDC';
  }

  private async getIndirectPrice(pair: string): Promise<PriceProviderResult> {
    const upperPair = pair.toUpperCase();
    
    if (upperPair === 'USDCMXN') {
      const [usdcUsdt, usdtMxn] = await Promise.all([
        this.priceProvider.getPrice('USDCUSDT'),
        this.priceProvider.getPrice('USDTMXN'),
      ]);
      
      const price = usdcUsdt.price * usdtMxn.price;
      
      return {
        price,
        symbol: pair,
        timestamp: Math.max(usdcUsdt.timestamp, usdtMxn.timestamp),
      };
    } else if (upperPair === 'MXNUSDC') {
      const [usdtMxn, usdcUsdt] = await Promise.all([
        this.priceProvider.getPrice('USDTMXN'),
        this.priceProvider.getPrice('USDCUSDT'),
      ]);
      
      const price = 1 / (usdtMxn.price * usdcUsdt.price);
      
      return {
        price,
        symbol: pair,
        timestamp: Math.max(usdtMxn.timestamp, usdcUsdt.timestamp),
      };
    }
    
    throw new Error(`Indirect conversion not supported for pair: ${pair}`);
  }

  private async getPricingRule(pair: string): Promise<PricingRule> {
    const supabase = getServerSupabase();
    
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('pair', pair)
      .single();

    if (error || !data) {
      throw new Error(
        `Pricing rule not found for pair: ${pair}. ${error?.message || 'No data returned'}`
      );
    }

    if (data.spread_buy < 0 || data.spread_sell < 0) {
      throw new Error(
        `Invalid spread values for pair ${pair}. Spreads must be non-negative.`
      );
    }

    return data as PricingRule;
  }

  async getBuyPrice(pair: string, useCache = true): Promise<BuyPriceResult> {
    const mappedPair = this.mapPXOToMXN(pair);
    const cacheKey = pair;
    
    if (useCache) {
      const cached = priceCache.get(cacheKey);
      if (cached) {
        const pricingRule = await this.getPricingRule(mappedPair);
        return {
          price: cached.buy,
          basePrice: cached.basePrice,
          spread: pricingRule.spread_buy,
          pair: cacheKey,
          timestamp: cached.timestamp,
        };
      }
    }

    const [pricingRule, priceData] = await Promise.all([
      this.getPricingRule(mappedPair),
      this.needsIndirectConversion(mappedPair)
        ? this.getIndirectPrice(mappedPair)
        : this.priceProvider.getPrice(mappedPair),
    ]);

    const basePrice = priceData.price;
    const spread = pricingRule.spread_buy;
    const finalPrice = basePrice * (1 + spread);

    return {
      price: finalPrice,
      basePrice,
      spread,
      pair: cacheKey,
      timestamp: Date.now(),
    };
  }

  async getSellPrice(pair: string, useCache = true): Promise<SellPriceResult> {
    const mappedPair = this.mapPXOToMXN(pair);
    const cacheKey = pair;
    
    if (useCache) {
      const cached = priceCache.get(cacheKey);
      if (cached) {
        const pricingRule = await this.getPricingRule(mappedPair);
        return {
          price: cached.sell,
          basePrice: cached.basePrice,
          spread: pricingRule.spread_sell,
          pair: cacheKey,
          timestamp: cached.timestamp,
        };
      }
    }

    const [pricingRule, priceData] = await Promise.all([
      this.getPricingRule(mappedPair),
      this.needsIndirectConversion(mappedPair)
        ? this.getIndirectPrice(mappedPair)
        : this.priceProvider.getPrice(mappedPair),
    ]);

    const basePrice = priceData.price;
    const spread = pricingRule.spread_sell;
    const finalPrice = basePrice * (1 - spread);

    return {
      price: finalPrice,
      basePrice,
      spread,
      pair: cacheKey,
      timestamp: Date.now(),
    };
  }

  async getPrices(pair: string): Promise<{ buy: BuyPriceResult; sell: SellPriceResult }> {
    const mappedPair = this.mapPXOToMXN(pair);
    const cacheKey = pair;
    const cached = priceCache.get(cacheKey);
    
    if (cached) {
      const pricingRule = await this.getPricingRule(mappedPair);
      return {
        buy: {
          price: cached.buy,
          basePrice: cached.basePrice,
          spread: pricingRule.spread_buy,
          pair: cacheKey,
          timestamp: cached.timestamp,
        },
        sell: {
          price: cached.sell,
          basePrice: cached.basePrice,
          spread: pricingRule.spread_sell,
          pair: cacheKey,
          timestamp: cached.timestamp,
        },
      };
    }

    const [buyPrice, sellPrice] = await Promise.all([
      this.getBuyPrice(pair, false),
      this.getSellPrice(pair, false),
    ]);

    priceCache.set(buyPrice, sellPrice);

    return { buy: buyPrice, sell: sellPrice };
  }
}


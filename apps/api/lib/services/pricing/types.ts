export interface PricingRule {
  id: string;
  pair: string;
  spread_buy: number;
  spread_sell: number;
  updated_at: string;
}

export interface PriceProviderResult {
  price: number;
  symbol: string;
  timestamp: number;
}

export interface BuyPriceResult {
  price: number;
  basePrice: number;
  spread: number;
  pair: string;
  timestamp: number;
}

export interface SellPriceResult {
  price: number;
  basePrice: number;
  spread: number;
  pair: string;
  timestamp: number;
}


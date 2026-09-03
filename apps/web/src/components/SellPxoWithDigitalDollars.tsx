import { ExchangeRates } from './ExchangeRates';

/**
 * Sell-only page: reuses ExchangeRates locked to sell mode with a "Sell PXO"
 * title. Reached from the balance-card Sell button (via SellOptionsModal →
 * Digital Dollars).
 */
export function SellPxoWithDigitalDollars() {
  return <ExchangeRates lockedMode="sell" title="Sell PXO" />;
}

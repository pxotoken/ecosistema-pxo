import { ExchangeRates } from './ExchangeRates';

/**
 * Buy-only page: reuses ExchangeRates locked to buy mode with a "Buy PXO"
 * title. Reached from the balance-card Buy button and top-nav Buy link
 * (via BuyOptionsModal → Digital Dollars).
 */
export function BuyPxoWithDigitalDollars() {
  return <ExchangeRates lockedMode="buy" title="Buy PXO" />;
}

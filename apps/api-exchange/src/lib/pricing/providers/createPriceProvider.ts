import { env } from '../../../config/env.js';
import type { IPriceProvider } from './PriceProvider.js';
import { BinancePriceProvider } from './BinancePriceProvider.js';
import { BitsoPriceProvider } from './BitsoPriceProvider.js';

/**
 * Select the pair-pricing source from the PRICE_PROVIDER env toggle.
 * Defaults to Binance; an unrecognized value also falls back to Binance so a
 * typo never takes pricing down.
 */
export function createPriceProvider(): IPriceProvider {
  switch (env.PRICE_PROVIDER) {
    case 'bitso':
      // Bitso has no USDC market; optionally correct the USDC↔USDT leg with a
      // live rate from Binance instead of assuming a 1:1 peg.
      return new BitsoPriceProvider(
        env.BITSO_USDC_CORRECTION_ENABLED ? new BinancePriceProvider() : undefined,
      );
    case 'binance':
      return new BinancePriceProvider();
    default:
      console.warn(
        `[pricing] Unknown PRICE_PROVIDER="${env.PRICE_PROVIDER}", falling back to Binance.`,
      );
      return new BinancePriceProvider();
  }
}

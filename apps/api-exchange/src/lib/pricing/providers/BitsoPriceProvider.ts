import { env } from '../../../config/env.js';
import type { IPriceProvider } from './PriceProvider.js';
import type { PriceProviderResult } from '../types.js';

// Bitso PUBLIC ticker API (no auth): GET {base}/ticker?book=usdt_mxn
// Reference: https://docs.bitso.com/bitso-api/docs/ticker
// This is a different surface from the authenticated Business API used in
// lib/bitso.ts (BITSO_API_BASE_URL) — hence its own BITSO_TICKER_BASE_URL.
interface BitsoTickerResponse {
  success: boolean;
  payload?: { book: string; last: string };
  error?: { message?: string };
}

// Currencies we expect to appear in the concatenated symbols the
// PricingService requests (e.g. "USDTMXN", "USDCUSDT"). Order-independent;
// the splitter tries the 4-char prefix before the 3-char one.
const KNOWN_CURRENCIES = ['USDT', 'USDC', 'MXN', 'USD', 'BTC', 'ETH', 'DAI', 'ARS', 'BRL'];

// ⚠️ BUSINESS DECISION: Bitso lists NO USDC markets (no usdc_usdt, no usdc_mxn
// — verified against the live ticker API). Because USDC and USDT are both
// USD-pegged, we price USDC off the equivalent USDT book. By default this
// treats USDC≡USDT (1:1), ignoring basis/depeg risk. Pass a `correctionProvider`
// (see BITSO_USDC_CORRECTION_ENABLED) to replace the 1:1 assumption with a live
// USDC/USDT cross-rate from another feed. Only applies when PRICE_PROVIDER=bitso.
const BITSO_CURRENCY_ALIASES: Record<string, string> = { USDC: 'USDT' };

export class BitsoPriceProvider implements IPriceProvider {
  /**
   * @param correctionProvider Optional feed (e.g. Binance, which has USDCUSDT)
   *   used to price the USDC↔USDT leg. When omitted, that leg is assumed 1:1.
   */
  constructor(private correctionProvider?: IPriceProvider) {}

  async getPrice(symbol: string): Promise<PriceProviderResult> {
    const [rawBase, rawQuote] = this.splitSymbol(symbol);
    const base = this.alias(rawBase);
    const quote = this.alias(rawQuote);

    // After aliasing, the two sides collapse to the same Bitso currency
    // (e.g. USDC→USDT vs USDT). Resolve that leg without hitting a book.
    if (base === quote) {
      // Genuinely identical currency → exactly 1:1.
      if (rawBase === rawQuote) {
        return { price: 1, symbol, timestamp: Date.now() };
      }
      // Aliased apart (USDC vs USDT): use the live cross-rate from the
      // correction feed if configured, else fall back to the 1:1 peg.
      if (this.correctionProvider) {
        const corrected = await this.correctionProvider.getPrice(symbol);
        return { price: corrected.price, symbol, timestamp: Date.now() };
      }
      return { price: 1, symbol, timestamp: Date.now() };
    }

    // Bitso lists each pair in a single canonical direction (e.g. `usdt_mxn`
    // exists, `mxn_usdt` does not). Try the direct book, then the inverse and
    // reciprocate the price — mirroring how PricingService handles inversions.
    const direct = await this.fetchBookLast(`${base.toLowerCase()}_${quote.toLowerCase()}`);
    if (direct !== null) {
      return { price: direct, symbol, timestamp: Date.now() };
    }

    const inverse = await this.fetchBookLast(`${quote.toLowerCase()}_${base.toLowerCase()}`);
    if (inverse !== null && inverse !== 0) {
      return { price: 1 / inverse, symbol, timestamp: Date.now() };
    }

    throw new Error(
      `Bitso has no ticker book for ${symbol} (tried ${base}_${quote} and its inverse)`,
    );
  }

  private alias(currency: string): string {
    return BITSO_CURRENCY_ALIASES[currency] ?? currency;
  }

  private async fetchBookLast(book: string): Promise<number | null> {
    const url = `${env.BITSO_TICKER_BASE_URL}/ticker?book=${encodeURIComponent(book)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as BitsoTickerResponse;
    if (!data.success || !data.payload?.last) return null;
    const price = parseFloat(data.payload.last);
    return Number.isFinite(price) ? price : null;
  }

  private splitSymbol(symbol: string): [string, string] {
    const s = symbol.toUpperCase();
    for (const len of [4, 3]) {
      const base = s.slice(0, len);
      const quote = s.slice(len);
      if (KNOWN_CURRENCIES.includes(base) && KNOWN_CURRENCIES.includes(quote)) {
        return [base, quote];
      }
    }
    throw new Error(`BitsoPriceProvider: unable to parse trading symbol "${symbol}"`);
  }
}

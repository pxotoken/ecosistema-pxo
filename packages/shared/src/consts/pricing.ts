/**
 * Pricing Constants
 */

/**
 * Upper bound on a pricing-rule spread, as a fraction (0.10 = 10%).
 *
 * Spreads are stored as fractions and applied as `base * (1 ± spread)`, so the
 * difference between 0.0058 and 0.058 is a tenfold mispricing that looks
 * entirely plausible in a text input. A real FX spread on a stablecoin pair is
 * well under 2%; 10% is far beyond anything legitimate while still leaving
 * room to experiment.
 *
 * Enforced in api-exchange's admin pricing-rules routes, which previously only
 * rejected negatives, and mirrored in the admin form so the slip is caught
 * before it is sent. The server is the control; the form is the courtesy.
 */
export const MAX_PRICING_SPREAD = 0.1;

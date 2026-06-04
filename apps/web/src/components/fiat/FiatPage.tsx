import { BuyPxoWithMxn } from './BuyPxoWithMxn';
import { RedeemPxoToMxn } from './RedeemPxoToMxn';

/**
 * Demo container that hosts both fiat flows side-by-side. Mounted at
 * /dashboard/fiat. The team can split these into separate routes or move
 * them into existing pages later — kept together here so the investor
 * walk-through can show both directions on one screen.
 */
export function FiatPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Fiat (MXN)</h1>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          On-ramp vía Conekta; off-ramp vía Bitso SPEI. PXO está peggeado 1:1 a MXN.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BuyPxoWithMxn />
        <RedeemPxoToMxn />
      </div>
    </div>
  );
}

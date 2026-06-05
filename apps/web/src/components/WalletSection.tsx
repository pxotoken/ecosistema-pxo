import { PxoBalanceCard } from './PxoBalanceCard';
import { WalletOverview } from './WalletOverview';
import { TransactionTimeline } from './TransactionTimeline';

export function WalletSection() {
  return (
    <div className="space-y-8">
      <PxoBalanceCard />
      <WalletOverview />
      <TransactionTimeline />
    </div>
  );
}

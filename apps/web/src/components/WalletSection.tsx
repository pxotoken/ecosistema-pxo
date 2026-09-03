import { BalanceCard } from './BalanceCard';
import { TransactionActivityPane } from './TransactionActivityPane';

export function WalletSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-6 items-start max-w-6xl mx-auto">
      <BalanceCard />
      <TransactionActivityPane />
    </div>
  );
}

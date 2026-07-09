import { BalanceCard } from './BalanceCard';
import { TransactionActivityPane } from './TransactionActivityPane';

export function WalletSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr] gap-6 items-start">
      <BalanceCard />
      <TransactionActivityPane />
    </div>
  );
}

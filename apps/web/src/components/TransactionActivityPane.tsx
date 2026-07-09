import { TransactionTimeline } from './TransactionTimeline';

export function TransactionActivityPane() {
  return (
    <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-glass overflow-hidden">
      <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Transaction Activity
        </h2>
      </div>
      <div className="p-4">
        <TransactionTimeline />
      </div>
    </div>
  );
}

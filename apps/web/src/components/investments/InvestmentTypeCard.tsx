import { motion } from 'framer-motion';
import type { InvestmentType } from '../../hooks/useInvestmentTypes';

interface InvestmentTypeCardProps {
  type: InvestmentType;
  onBuy: (type: InvestmentType) => void;
}

export function InvestmentTypeCard({ type, onBuy }: InvestmentTypeCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="group bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 flex flex-col gap-4 transition-colors hover:border-pxo-primary/60"
    >
      <div>
        <h2 className="text-2xl font-bold font-editorial text-light-text dark:text-dark-text">
          {type.display_name}
        </h2>
        <p className="mt-1 text-lg font-semibold text-brand-accent dark:text-dark-text">
          {Number(type.apy_percent).toFixed(2)}% APY
        </p>
      </div>

      <button
        type="button"
        onClick={() => onBuy(type)}
        className="mt-auto w-full bg-brand-accent text-white px-4 py-2.5 rounded-lg font-medium hover:shadow-glow transition-all"
      >
        Buy
      </button>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { InvestmentTypeCard } from './InvestmentTypeCard';
import { useInvestmentTypes, type InvestmentType } from '../../hooks/useInvestmentTypes';
import { PATHS } from '../../routes/paths';

export function InvestmentsPage() {
  const { types, loading, error } = useInvestmentTypes();
  const navigate = useNavigate();

  const handleBuy = (type: InvestmentType) => {
    navigate(PATHS.dashboard.investmentDetail(type.name));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text font-editorial">
          Explore Investment Options
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
          Put your PXO to work for a fixed period and receive it back with its yield.
        </p>
      </motion.div>

      {loading && (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Loading…</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && types.length === 0 && (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          There are no investments available right now.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {types.map((type) => (
          <InvestmentTypeCard key={type.id} type={type} onBuy={handleBuy} />
        ))}
      </div>
    </div>
  );
}

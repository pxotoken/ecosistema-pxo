import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LockPxoCard } from './LockPxoCard';
import { useFixedTermCds, type FixedTermCd } from '../../hooks/useFixedTermCds';
import { useInvestmentType } from '../../hooks/useInvestmentTypes';
import { PATHS } from '../../routes/paths';

const STATUS_STYLES: Record<FixedTermCd['status'], string> = {
  AWAITING_PXO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  MATURED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PAID: 'bg-light-glass dark:bg-dark-glass text-light-text-secondary dark:text-dark-text-secondary',
  FAILED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  CANCELLED:
    'bg-light-glass dark:bg-dark-glass text-light-text-secondary dark:text-dark-text-secondary',
};

const STATUS_LABELS: Record<FixedTermCd['status'], string> = {
  AWAITING_PXO: 'Not funded',
  ACTIVE: 'Locked',
  MATURED: 'Matured',
  PAID: 'Paid out',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function FixedTermPage() {
  const { typeName } = useParams<{ typeName: string }>();
  const { type, loading: typeLoading, error: typeError } = useInvestmentType(typeName);
  const { cds, loading, error, refetch } = useFixedTermCds();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          to={PATHS.dashboard.investments}
          className="inline-flex items-center gap-1 text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-pxo-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Investments
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-light-text dark:text-dark-text font-editorial">
          {/* The product's commercial name. While it loads the heading stays
              empty rather than showing a placeholder that then changes. */}
          {typeLoading ? '' : (type?.display_name ?? 'Investment')}
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
          Commit PXO for a fixed period and receive it back with its yield at maturity.
        </p>
        {typeError && <p className="mt-2 text-sm text-red-500">{typeError}</p>}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LockPxoCard investmentTypeId={type?.id} onLocked={refetch} />

        <div className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
            Your certificates
          </h2>

          {loading && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Loading…
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !error && cds.length === 0 && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              You have no certificates yet.
            </p>
          )}

          <div className="space-y-3">
            {cds.map((cd) => (
              <div
                key={cd.id}
                className="border border-light-border dark:border-dark-border rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-light-text dark:text-dark-text">
                    {/* Before funding there is no principal yet, only what was asked for. */}
                    {cd.principal_pxo ?? cd.requested_pxo} PXO
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[cd.status]}`}>
                    {STATUS_LABELS[cd.status]}
                  </span>
                </div>
                <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
                  <div>
                    {cd.term_days} days · {Number(cd.annual_yield_percent).toFixed(2)}% per year
                  </div>
                  <div>
                    Deposited {formatDate(cd.deposit_date)} · matures{' '}
                    {formatDate(cd.maturity_date)}
                  </div>
                  {cd.failure_reason && (
                    <div className="text-red-500">{cd.failure_reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

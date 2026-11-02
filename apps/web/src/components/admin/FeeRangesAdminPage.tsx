import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Info } from 'lucide-react';
import { useFeeRanges, FeeRange, FeeRangeInput } from '../../hooks/useFeeRanges';
import { FeeRangeModal } from './FeeRangeModal';

const fmtAmount = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 8 });

/**
 * Fee by range — stakeholder data entry.
 *
 * Deliberately a plain CRUD table. These percentages are not applied to any
 * transaction anywhere in the app; the screen exists so commercial scenarios
 * can be written down and simulated. The banner says so on the page, because
 * a screen full of discount percentages in an admin panel otherwise looks
 * exactly like something that is live.
 */
export const FeeRangesAdminPage: React.FC = () => {
  const { ranges, loading, error, createRange, updateRange, deleteRange } = useFeeRanges();
  const [selected, setSelected] = useState<FeeRange | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = async (input: FeeRangeInput) => {
    if (selected) await updateRange(selected.id, input);
    else await createRange(input);
  };

  const handleDelete = async (range: FeeRange) => {
    setDeletingId(range.id);
    try {
      await deleteRange(range.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text font-editorial">
            Fee by range
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 text-sm">
            Amount bands with a concept label and a percentage, for scenario modelling.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 shrink-0 px-4 py-2 rounded-lg bg-pxo-primary text-white text-sm font-medium hover:bg-pxo-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New range
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-light-border dark:border-dark-border bg-light-glass dark:bg-dark-glass p-4">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-light-text-secondary dark:text-dark-text-secondary" />
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          These percentages are <strong>not applied to any transaction</strong>. This screen
          records scenarios so they can be simulated and discussed; nothing here changes what a
          user is charged.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-light-surface dark:bg-dark-surface rounded-xl border border-light-border dark:border-dark-border overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-light-text-secondary dark:text-dark-text-secondary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : ranges.length === 0 ? (
          <div className="p-10 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
            No ranges yet. Add one to start modelling a scenario.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-border dark:border-dark-border text-left text-light-text-secondary dark:text-dark-text-secondary">
                  <th className="px-4 py-3 font-medium">Concept</th>
                  <th className="px-4 py-3 font-medium text-right">From</th>
                  <th className="px-4 py-3 font-medium text-right">To</th>
                  <th className="px-4 py-3 font-medium text-right">Percent</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {ranges.map((r) => (
                  <tr key={r.id} className="text-light-text dark:text-dark-text">
                    <td className="px-4 py-3 font-mono">{r.concept}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtAmount(r.amount_from)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtAmount(r.amount_to)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.percent}%</td>
                    <td className="px-4 py-3 text-light-text-secondary dark:text-dark-text-secondary">
                      {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(r);
                            setIsModalOpen(true);
                          }}
                          aria-label={`Edit ${r.concept}`}
                          className="p-2 rounded-lg text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          aria-label={`Delete ${r.concept}`}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <FeeRangeModal
        range={selected}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

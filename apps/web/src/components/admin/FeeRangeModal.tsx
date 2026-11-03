import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { FeeRange, FeeRangeInput, FEE_CONCEPT_RE } from '../../hooks/useFeeRanges';
import { useTokens } from '../../hooks/useTokens';

interface FeeRangeModalProps {
  range: FeeRange | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: FeeRangeInput) => Promise<void>;
}

/**
 * While editing, the numeric fields are STRINGS.
 *
 * Holding them as numbers meant an empty field had to become something, and
 * that something was 0 — so clearing the box put a "0" back in it, and the
 * next keystroke produced "01000". A string lets empty stay empty; the values
 * are parsed once, on submit.
 */
interface Draft {
  concept: string;
  denomination: string;
  amount_from: string;
  amount_to: string;
  percent: string;
}

const EMPTY: Draft = {
  concept: '',
  denomination: '',
  amount_from: '',
  amount_to: '',
  percent: '',
};

export const FeeRangeModal: React.FC<FeeRangeModalProps> = ({
  range,
  isOpen,
  onClose,
  onSave,
}) => {
  const { tokens, loading: tokensLoading } = useTokens();
  const [form, setForm] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      range
        ? {
            concept: range.concept,
            denomination: range.denomination,
            amount_from: String(range.amount_from),
            amount_to: String(range.amount_to),
            percent: String(range.percent),
          }
        : EMPTY,
    );
    setError(null);
  }, [range, isOpen]);

  if (!isOpen) return null;

  /**
   * Parse the draft into the payload, or explain what is wrong. Mirrors the API
   * and the table's CHECK constraints, so the slip is caught here first.
   */
  const parse = (): { input: FeeRangeInput } | { error: string } => {
    if (!FEE_CONCEPT_RE.test(form.concept)) {
      return { error: 'Concept must be 1-64 letters and digits only — no spaces or punctuation.' };
    }
    if (!form.denomination) return { error: 'Pick a denomination.' };

    const amount_from = Number.parseFloat(form.amount_from);
    const amount_to = Number.parseFloat(form.amount_to);
    const percent = Number.parseFloat(form.percent);

    // An empty box is now genuinely empty rather than silently 0, so it has to
    // be named as missing instead of passing as a valid zero.
    if (!Number.isFinite(amount_from)) return { error: 'Enter a From amount.' };
    if (!Number.isFinite(amount_to)) return { error: 'Enter a To amount.' };
    if (!Number.isFinite(percent)) return { error: 'Enter a percent.' };

    if (amount_from < 0) return { error: 'From must not be negative.' };
    if (amount_to <= amount_from) return { error: 'To must be greater than From.' };
    if (percent < 0 || percent > 100) return { error: 'Percent must be between 0 and 100.' };

    return {
      input: { concept: form.concept, denomination: form.denomination, amount_from, amount_to, percent },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parse();
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(parsed.input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-accent';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-light-surface dark:bg-dark-surface w-full max-w-lg rounded-2xl border border-light-border dark:border-dark-border p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {range ? 'Edit fee range' : 'New fee range'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-light-text-secondary dark:text-dark-text-secondary hover:opacity-80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fee-concept"
              className="block text-sm font-medium text-light-text dark:text-dark-text mb-2"
            >
              Concept (letters and digits only)
            </label>
            <input
              id="fee-concept"
              type="text"
              value={form.concept}
              // Strip as they type rather than rejecting on submit — the rule is
              // simple enough that silently refusing the keystroke is clearer
              // than an error after the fact.
              onChange={(e) =>
                setForm({ ...form, concept: e.target.value.replace(/[^A-Za-z0-9]/g, '') })
              }
              maxLength={64}
              placeholder="buypxodiscount"
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label
              htmlFor="fee-denomination"
              className="block text-sm font-medium text-light-text dark:text-dark-text mb-2"
            >
              Denomination
            </label>
            <select
              id="fee-denomination"
              value={form.denomination}
              onChange={(e) => setForm({ ...form, denomination: e.target.value })}
              disabled={tokensLoading}
              className={`${inputClass} disabled:opacity-60`}
            >
              <option value="">
                {tokensLoading ? 'Loading…' : 'Select a unit'}
              </option>
              {/* Symbols come from the tokens table, which carries both the
                  on-chain tokens and the fiat units, so a band can be counted
                  in PXO or in USD. */}
              {tokens.map((t) => (
                <option key={t.id} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
              What the From and To amounts are counted in.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fee-from"
                className="block text-sm font-medium text-light-text dark:text-dark-text mb-2"
              >
                From
              </label>
              <input
                id="fee-from"
                type="number"
                min="0"
                step="any"
                value={form.amount_from}
                onChange={(e) => setForm({ ...form, amount_from: e.target.value })}
                placeholder="1000000"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="fee-to"
                className="block text-sm font-medium text-light-text dark:text-dark-text mb-2"
              >
                To
              </label>
              <input
                id="fee-to"
                type="number"
                min="0"
                step="any"
                value={form.amount_to}
                onChange={(e) => setForm({ ...form, amount_to: e.target.value })}
                placeholder="5000000"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="fee-percent"
              className="block text-sm font-medium text-light-text dark:text-dark-text mb-2"
            >
              Percent (10 = 10%)
            </label>
            <input
              id="fee-percent"
              type="number"
              min="0"
              max="100"
              step="any"
              value={form.percent}
              onChange={(e) => setForm({ ...form, percent: e.target.value })}
              placeholder="10"
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 rounded-lg bg-pxo-primary text-white font-medium hover:bg-pxo-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

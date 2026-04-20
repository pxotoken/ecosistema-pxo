import React, { useState, useEffect } from 'react';
import { PricingRule } from '../../hooks/usePricingRules';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingRuleModalProps {
  rule: PricingRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: Omit<PricingRule, 'id' | 'updated_at'> | Partial<PricingRule> & { id: string }) => Promise<void>;
}

export const PricingRuleModal: React.FC<PricingRuleModalProps> = ({
  rule,
  isOpen,
  onClose,
  onSave
}) => {
  const [pair, setPair] = useState('');
  const [spreadBuy, setSpreadBuy] = useState(0);
  const [spreadSell, setSpreadSell] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setPair(rule.pair);
      setSpreadBuy(rule.spread_buy);
      setSpreadSell(rule.spread_sell);
    } else {
      setPair('');
      setSpreadBuy(0);
      setSpreadSell(0);
    }
    setError(null);
  }, [rule, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (rule) {
        await onSave({
          id: rule.id,
          pair: pair.toUpperCase(),
          spread_buy: spreadBuy,
          spread_sell: spreadSell
        });
      } else {
        await onSave({
          pair: pair.toUpperCase(),
          spread_buy: spreadBuy,
          spread_sell: spreadSell
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-light-border dark:border-dark-border w-full max-w-md"
        >
          <div className="flex items-center justify-between p-6 border-b border-light-border dark:border-dark-border">
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              {rule ? 'Edit Pricing Rule' : 'New Pricing Rule'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-light-glass dark:hover:bg-dark-glass rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="pair-input" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Pair (e.g.: BTCUSDT, USDTMXN)
              </label>
              <input
                id="pair-input"
                type="text"
                value={pair}
                onChange={(e) => setPair(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                required
                className="w-full px-4 py-2 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-lime-accent"
              />
            </div>

            <div>
              <label htmlFor="spread-buy-input" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Spread Buy (e.g.: 0.03 = 3%)
              </label>
              <input
                id="spread-buy-input"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={spreadBuy}
                onChange={(e) => setSpreadBuy(Number.parseFloat(e.target.value) || 0)}
                placeholder="0.03"
                required
                className="w-full px-4 py-2 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-lime-accent"
              />
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {(spreadBuy * 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <label htmlFor="spread-sell-input" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Spread Sell (e.g.: 0.03 = 3%)
              </label>
              <input
                id="spread-sell-input"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={spreadSell}
                onChange={(e) => setSpreadSell(Number.parseFloat(e.target.value) || 0)}
                placeholder="0.03"
                required
                className="w-full px-4 py-2 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-lime-accent"
              />
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {(spreadSell * 100).toFixed(2)}%
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-light-glass dark:bg-dark-glass hover:bg-light-border dark:hover:bg-dark-border border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-lime-accent hover:bg-lime-accent/90 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


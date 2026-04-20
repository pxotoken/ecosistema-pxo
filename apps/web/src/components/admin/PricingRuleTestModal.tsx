import React, { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingRuleTestModalProps {
  pair: string;
  type: 'buy' | 'sell';
  isOpen: boolean;
  onClose: () => void;
  onTest: (pair: string, type: 'buy' | 'sell') => Promise<{ price: number; basePrice: number; spread: number }>;
}

export const PricingRuleTestModal: React.FC<PricingRuleTestModalProps> = ({
  pair,
  type,
  isOpen,
  onClose,
  onTest
}) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ price: number; basePrice: number; spread: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pair) {
      handleTest();
    } else {
      setResult(null);
      setError(null);
    }
  }, [isOpen, pair, type]);

  const handleTest = async () => {
    if (!pair) return;
    
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const testResult = await onTest(pair, type);
      setResult(testResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error testing price');
    } finally {
      setTesting(false);
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
              Test Price - {pair}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-light-glass dark:hover:bg-dark-glass rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {testing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    {type === 'buy' && <TrendingUp className="h-6 w-6 text-green-500" />}
                    {type === 'sell' && <TrendingDown className="h-6 w-6 text-orange-500" />}
                    <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                      {type === 'buy' ? 'Buy' : 'Sell'} Price
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Base Price:
                      </span>
                      <span className="font-mono font-semibold text-light-text dark:text-dark-text">
                        ${result.basePrice.toFixed(8)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Applied Spread:
                      </span>
                      <span className="font-mono font-semibold text-light-text dark:text-dark-text">
                        {(result.spread * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="pt-2 border-t border-light-border dark:border-dark-border">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-light-text dark:text-dark-text">
                          Final Price:
                        </span>
                        <span className="font-mono text-2xl font-bold text-lime-accent">
                          ${result.price.toFixed(8)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTest}
                  className="w-full px-4 py-2 bg-lime-accent hover:bg-lime-accent/90 text-black rounded-lg font-medium transition-colors"
                >
                  Refresh Test
                </button>
              </div>
            ) : null}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-light-glass dark:bg-dark-glass hover:bg-light-border dark:hover:bg-dark-border border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


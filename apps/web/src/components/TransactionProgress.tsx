import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Loader2, ExternalLink } from 'lucide-react';
import { WalletSignatureBanner } from './ui/WalletSignatureBanner';

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  txHash?: string;
  error?: string;
}

interface TransactionProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TransactionStep[];
  currentStep: number;
  title: string;
  onViewTransaction?: (txHash: string) => void;
  isAwaitingSignature?: boolean;
  signatureSecondsLeft?: number | null;
}

export const TransactionProgress: React.FC<TransactionProgressProps> = ({
  isOpen,
  onClose,
  steps,
  currentStep,
  title,
  onViewTransaction,
  isAwaitingSignature,
  signatureSecondsLeft,
}) => {
  const getStepIcon = (step: TransactionStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (step.status === 'loading' || (step.status === 'pending' && index === currentStep)) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (step.status === 'error') {
      return <CheckCircle className="w-5 h-5 text-red-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStepStatus = (step: TransactionStep, index: number) => {
    if (step.status === 'completed') {
      return 'text-green-600 dark:text-green-400';
    }
    if (step.status === 'loading' || (step.status === 'pending' && index === currentStep)) {
      return 'text-blue-600 dark:text-blue-400';
    }
    if (step.status === 'error') {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-500 dark:text-gray-400';
  };

  const isCompleted = steps.every(step => step.status === 'completed');
  const hasError = steps.some(step => step.status === 'error');

  // Don't render if not open or no steps
  if (!isOpen || steps.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-light-text dark:text-dark-text font-editorial mb-2">
            {title}
          </h2>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                hasError 
                  ? 'bg-red-500' 
                  : isCompleted 
                    ? 'bg-green-500' 
                    : 'bg-blue-500'
              }`}
              initial={{ width: 0 }}
              animate={{ 
                width: `${((currentStep + 1) / steps.length) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
            {hasError 
              ? 'Transaction error' 
              : isCompleted 
                ? 'Transaction completed' 
                : `Step ${currentStep + 1} of ${steps.length}`
            }
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step, index)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${getStepStatus(step, index)}`}>
                  {step.title}
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  {step.description}
                </p>
                {step.txHash && (
                  <button
                    onClick={() => onViewTransaction?.(step.txHash!)}
                    className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
                  >
                    <span>View transaction</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {step.error && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {step.error}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {isAwaitingSignature && !isCompleted && !hasError && (
          <div className="mt-5">
            <WalletSignatureBanner secondsLeft={signatureSecondsLeft ?? undefined} />
          </div>
        )}

        {(isCompleted || hasError) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 pt-4 border-t border-light-border dark:border-dark-border"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full bg-lime-accent text-light-base dark:text-dark-base px-4 py-2 rounded-lg font-medium hover:shadow-glow transition-all duration-300"
            >
              {hasError ? 'Close' : 'Continue'}
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

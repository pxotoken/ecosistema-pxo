import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, LogOut, Activity } from 'lucide-react';

interface SessionRenewalModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  isCriticalActivity?: boolean;
  currentActivityType?: string;
  onRenew: () => void;
  onLogout: () => void;
  autoRenewEnabled?: boolean;
  isRenewing?: boolean;
}

export const SessionRenewalModal: React.FC<SessionRenewalModalProps> = ({
  isOpen,
  remainingSeconds,
  isCriticalActivity = false,
  currentActivityType,
  onRenew,
  onLogout,
  autoRenewEnabled = false,
  isRenewing = false,
}) => {
  const [countdown, setCountdown] = useState(remainingSeconds);

  useEffect(() => {
    if (!isRenewing) {
      setCountdown(remainingSeconds);
    }
  }, [remainingSeconds, isRenewing]);

  useEffect(() => {
    if (!isOpen || isRenewing) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRenewing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getActivityLabel = (type?: string) => {
    const labels: Record<string, string> = {
      transaction_pending: 'Transaction in progress',
      transaction_signing: 'Signing transaction',
      exchange_processing: 'Processing exchange',
      wallet_operation: 'Wallet operation',
      kyc_uploading: 'Uploading KYC documents',
      form_editing: 'Editing form',
    };
    return type ? labels[type] || 'Activity detected' : '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={isCriticalActivity ? undefined : onLogout}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl p-8 w-full max-w-md">
              {isCriticalActivity && (
                <div className="mb-6 p-4 bg-lime-accent/10 border border-lime-accent/30 rounded-lg">
                  <div className="flex items-center gap-3 text-lime-accent">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <div>
                      <p className="font-semibold text-sm">
                        {getActivityLabel(currentActivityType)}
                      </p>
                      <p className="text-xs opacity-80 mt-1">
                        {autoRenewEnabled 
                          ? 'Session will renew automatically'
                          : 'Operation in progress detected'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
                  <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Session about to expire
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your session will expire in
                </p>
                
                <div className="inline-block">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-5xl font-bold text-orange-600 dark:text-orange-400 tabular-nums"
                  >
                    {formatTime(countdown)}
                  </motion.div>
                </div>
              </div>

              {!isCriticalActivity || !autoRenewEnabled ? (
                <>
                  <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                    Would you like to keep your session active?
                  </p>

                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onRenew}
                      disabled={isRenewing}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-lime-accent hover:bg-lime-accent/90 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRenewing ? 'animate-spin' : ''}`} />
                      {isRenewing ? 'Renewing...' : 'Renew session'}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onLogout}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Log out
                    </motion.button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-lime-accent mb-4">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-medium">
                      Auto-renewal enabled
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your session will be automatically renewed while you complete this operation
                  </p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                  For your security, sessions expire after{' '}
                  {Math.floor(parseInt(import.meta.env.VITE_JWT_EXPIRATION_TIME || "1800") / 60)} minutes of inactivity
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


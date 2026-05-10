import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { Wallet, Shield, Loader2, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import api, { getApiError } from '../../lib/api';

interface BalanceInfo {
  value: string;
  displayValue: string;
  symbol: string;
  decimals: number;
}

interface ChainBalances {
  chainName: string;
  native: BalanceInfo | null;
  pxo: BalanceInfo | null;
  usdc: BalanceInfo | null;
}

interface WalletStatusData {
  wallet: {
    address: string | null;
    primaryChain: {
      id: number;
      name: string;
    };
  };
  keyStatus: {
    configured: boolean;
    encrypted: boolean;
    canSign: boolean;
    error: string | null;
  };
  balances: Record<string, ChainBalances>;
}

export const WalletStatusPage: React.FC = () => {
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<WalletStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") || 
                  currentUser?.mail === "admin@pxo.com";

  const ENABLE_ADMIN_TESTNET = import.meta.env.VITE_ENABLE_ADMIN_TESTNET === 'true';
  const MAINNET_CHAIN_ID = '137';

  const visibleBalances = data?.balances
    ? Object.entries(data.balances).filter(
        ([chainId]) => ENABLE_ADMIN_TESTNET || chainId === MAINNET_CHAIN_ID
      )
    : [];

  const fetchWalletStatus = async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data: result } = await api.get('/api/wallet/admin/status');
      setData(result);
    } catch (err) {
      setError(getApiError(err, 'Error fetching wallet status'));
      console.error('Error fetching wallet status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentUser?.id && isAdmin) {
      fetchWalletStatus();
    }
  }, [isAuthenticated, currentUser?.id, isAdmin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400">
                You must be authenticated to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400">
                You do not have administrator permissions to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">
              Server Wallet Status
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Monitor balances and private key status
            </p>
            {ENABLE_ADMIN_TESTNET && (
              <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Testnet enabled
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchWalletStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-lime-accent hover:bg-lime-accent/90 text-black rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Error</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-6 shadow-glass"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-lime-accent/20 rounded-lg">
                    <Shield className="h-6 w-6 text-lime-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                    Private Key Status
                  </h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">
                      Configured
                    </span>
                    {data.keyStatus.configured ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">
                      Encrypted
                    </span>
                    {data.keyStatus.encrypted ? (
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-blue-500" />
                        <span className="text-sm text-blue-500">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Unlock className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm text-yellow-500">No</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">
                      Can Sign
                    </span>
                    {data.keyStatus.canSign ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-500">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm text-red-500">No</span>
                      </div>
                    )}
                  </div>
                  {data.keyStatus.error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {data.keyStatus.error}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-6 shadow-glass"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Wallet className="h-6 w-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                    Wallet Information
                  </h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Address
                    </span>
                    <p className="text-sm font-mono text-light-text dark:text-dark-text break-all mt-1">
                      {data.wallet.address || 'Not available'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Primary Network
                    </span>
                    <p className="text-sm font-medium text-light-text dark:text-dark-text mt-1">
                      {data.wallet.primaryChain.name} (ID: {data.wallet.primaryChain.id})
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {visibleBalances.map(([chainId, chainData], index) => (
              <motion.div
                key={chainId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-6 shadow-glass"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                    {chainData.chainName}
                  </h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary">
                    Chain {chainId}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-light-glass dark:bg-dark-glass rounded-lg border border-light-border dark:border-dark-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Native Balance
                      </span>
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {chainData.native?.symbol || 'N/A'}
                      </span>
                    </div>
                    {chainData.native ? (
                      <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                        {chainData.native.displayValue}
                      </p>
                    ) : (
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Not available
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-light-glass dark:bg-dark-glass rounded-lg border border-light-border dark:border-dark-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        PXO Balance
                      </span>
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {chainData.pxo?.symbol || 'N/A'}
                      </span>
                    </div>
                    {chainData.pxo ? (
                      <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                        {chainData.pxo.displayValue}
                      </p>
                    ) : (
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Not available
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-light-glass dark:bg-dark-glass rounded-lg border border-light-border dark:border-dark-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        USDC Balance
                      </span>
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {chainData.usdc?.symbol || 'N/A'}
                      </span>
                    </div>
                    {chainData.usdc ? (
                      <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                        {chainData.usdc.displayValue}
                      </p>
                    ) : (
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Not available
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};


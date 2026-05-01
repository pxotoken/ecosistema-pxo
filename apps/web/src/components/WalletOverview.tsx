import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Send, Download, Loader2, ChevronDown } from 'lucide-react';
import { useActiveAccount, useActiveWalletChain, useNetworkSwitcherModal, useWalletDetailsModal, useActiveWallet } from "thirdweb/react";
import { getBalance } from "thirdweb/extensions/erc20";
import { getWalletBalance } from "thirdweb/wallets";
import { useNavigate } from 'react-router-dom';
import { getThirdwebClient } from '../lib/client';
import useWalletStore from '../store/useWalletStore';
import { Chain } from "thirdweb";
import { useAuthContext } from '../contexts/AuthContext';
import { KYCStatus } from '@pxo/shared/types';
import { SendFundsModal } from './crypto/SendFundsModal';
import { PATHS } from '../routes/paths';

const client = getThirdwebClient();

const networkNames: Record<number, string> = {
  56: "BNB Chain",
  137: "Polygon",
  80002: "Polygon Amoy",
};

export const WalletOverview: React.FC = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [isGlitching, setIsGlitching] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  
  const activeChain = useActiveWalletChain();
  const account = useActiveAccount();
  const { tokens } = useWalletStore();
  const networkSwitcher = useNetworkSwitcherModal();
  const { currentChains } = useWalletStore();
  const { open } = useWalletDetailsModal();
  const wallet = useActiveWallet();
  const { user } = useAuthContext();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const availableTokens = activeChain && activeChain.id in tokens ? tokens[activeChain.id] : [];

  useEffect(() => {
    if (activeChain) {
      setSelectedToken(availableTokens[0]?.symbol || "");
    }
  }, [activeChain, availableTokens]);

  const fetchBalance = async (withLoading: boolean = true) => {
    if (account?.address && selectedToken && availableTokens.length > 0) {
      if (withLoading) {
        setLoading(true);
      }
      try {
        const token = availableTokens.find(t => t.symbol === selectedToken);
        if (token) {
          let balanceResult;
          if (token.address !== "0x0000000000000000000000000000000000000000") {
            balanceResult = await getBalance({
              contract: { client, address: token.address as `0x${string}`, chain: activeChain as Chain},
              address: account.address,
            });
          } else {
            balanceResult = await getWalletBalance({
              address: account.address,
              client,
              chain: activeChain as Chain,
            });
          }
          setBalance(balanceResult.displayValue);
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBalance(false);
    const intervalId = setInterval(() => fetchBalance(false), 5000);
    return () => clearInterval(intervalId);
  }, [account, selectedToken, availableTokens, activeChain]);

  useEffect(() => {
    setIsGlitching(true);
    const timer = setTimeout(() => setIsGlitching(false), 500);
    return () => clearTimeout(timer);
  }, [balance]);

  const switchNetwork = () => {
    networkSwitcher.open({
      client,
      theme: "dark",
      locale: "es_ES",
      sections: [{ label: "currentChains", chains: currentChains }],
    });
  };

  const handleSend = () => {
    if (user?.KYC_status !== KYCStatus.VALIDATED) {
      navigate(PATHS.dashboard.settings);
      return;
    }
    setIsSendModalOpen(true);
  };

  const handleReceive = () => {
    open({
      client,
      initialScreen: "receive",
      locale: "es_ES",
      chains: currentChains,
      supportedTokens: Object.fromEntries(
        Object.entries(tokens).map(([networkId, networkTokens]) => [
          networkId,
          networkTokens.filter(
            ({ address }) => address !== "0x0000000000000000000000000000000000000000"
          ),
        ])
      ),
    } as any);
  };

  const getNetworkName = (chainId: number | undefined) => {
    console.log("[getNetworkName] chainId", chainId);
    if (!chainId) return "";
    return networkNames[chainId] || `Chain ${chainId}`;
  };

  return (
    <div className="w-full sm:w-11/12 md:w-5/6 lg:w-4/5 xl:w-3/4 2xl:w-1/2">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-4 sm:p-6 shadow-glass relative overflow-hidden transition-colors duration-300 hover:border-lime-accent/30 hover:shadow-glow"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl" />
        
        <div className="relative flex flex-row justify-between items-start mb-4 z-10">
          <p className="text-base sm:text-sm lg:text-base text-light-text-secondary dark:text-dark-text-secondary font-medium">Available Balance</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={switchNetwork}
            className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 dark:text-dark-text-secondary transition-colors px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-blue-100/60 dark:bg-dark-glass dark:border dark:border-white/50"
          >
            <ArrowDownUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{getNetworkName(activeChain?.id)}</span>
          </motion.button>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, type: "spring" }}
              className="flex items-center justify-start gap-2 flex-wrap"
            >
              <span className="text-3xl sm:text-4xl font-bold text-pxo-primary dark:bg-pxo-gradient dark:text-transparent dark:bg-clip-text font-editorial break-all">
                {showBalances ? (
                  loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 10 })
                  )
                ) : (
                  '••••••••'
                )}
              </span>
              <div className="relative inline-flex items-center rounded-md transition-colors duration-200 hover:bg-gray-300/55 dark:hover:bg-gray-700/70">
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="appearance-none bg-transparent border-none cursor-pointer px-2 py-1 pr-7 text-lg font-semibold focus:outline-none transition-colors duration-200 text-pxo-primary dark:bg-pxo-gradient dark:text-transparent dark:bg-clip-text"
                >
                  {availableTokens.map(token => (
                    <option 
                      key={token.symbol} 
                      value={token.symbol} 
                      className="bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text"
                    >
                      {token.symbol}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  strokeWidth={2.5} 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none text-pxo-primary dark:text-dark-text" 
                />
              </div>
            </motion.div>

            <div className="flex flex-row gap-2 w-full sm:w-auto sm:min-w-[220px] relative z-10">
              <motion.button
                whileHover={user?.KYC_status === KYCStatus.VALIDATED ? { scale: 1.02 } : {}}
                whileTap={user?.KYC_status === KYCStatus.VALIDATED ? { scale: 0.98 } : {}}
                onClick={handleSend}
             //   disabled={user?.KYC_status !== KYCStatus.VALIDATED}
                className={`flex-1 flex items-center justify-center gap-1.5 transition-all duration-200 px-3 py-1.5 rounded-lg border text-sm font-medium shadow-md ${
                  user?.KYC_status === KYCStatus.VALIDATED
                    ? 'bg-lime-accent dark:bg-blue-600/85 border-blue-700/60 dark:border-blue-600/60 text-white cursor-pointer'
                    : 'bg-gray-400 dark:bg-gray-600 border-gray-500 dark:border-gray-500 text-white opacity-50 cursor-not-allowed'
                }`}
                //title={user?.KYC_status !== KYCStatus.VALIDATED ? 'Completa tu KYC para enviar tokens' : ''}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReceive}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/20 dark:bg-blue-500/20 transition-all duration-200 px-3 py-1.5 rounded-lg border border-blue-500/30 dark:border-blue-500/30 text-blue-700 dark:text-white text-sm font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Receive</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-light-border/50 dark:border-dark-border/50">
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Locked</p>
            <p className="text-base sm:text-lg font-medium text-light-text dark:text-dark-text">
              {showBalances ? `0.00 ${selectedToken}` : '••••••'}
            </p>
          </div>

          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Yield</p>
            <p className="text-base sm:text-lg font-medium text-light-text dark:text-dark-text">
              {showBalances ? `0.00 ${selectedToken}` : '••••••'}
            </p>
          </div>
        </div>
      </motion.div>
      <SendFundsModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  );
};
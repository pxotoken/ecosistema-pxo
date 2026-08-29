import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Download, TrendingUp, TrendingDown, Eye, Filter } from 'lucide-react';
import { useActiveWalletChain } from "thirdweb/react";
import { getExplorerTxUrlFromTx } from '../lib/explorer';
import { deduplicateBlockchainTxs, formatAmount } from '../lib/transactionUtils';
import { TransactionTypes } from '@pxo/shared/types';
import { useBlockchainTransactionHistory } from '../hooks/useBlockchainTransactionHistory';
import { useTransactionHistory } from '../hooks/useTransactionHistory';

const typeLabels: Record<string, string> = {
  SEND: "Send",
  RECEIVE: "Receive",
  BUY: "Buy",
  SELL: "Sell",
};

const typeColors: Record<string, string> = {
  SEND: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  RECEIVE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  BUY: "bg-green-500/10 text-green-500 border-green-500/20",
  SELL: "bg-red-500/10 text-red-500 border-red-500/20",
};

const typeIcons: Record<string, React.ReactNode> = {
  SEND: <Send className="w-4 h-4" />,
  RECEIVE: <Download className="w-4 h-4" />,
  BUY: <TrendingUp className="w-4 h-4" />,
  SELL: <TrendingDown className="w-4 h-4" />,
};

// Función para truncar direcciones
const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const TransactionHistory: React.FC = () => {
  const activeChain = useActiveWalletChain();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  
  // Usar ambos hooks
  const { 
    transactions: blockchainTransactions, 
    isLoading: isLoadingBlockchain,
    updateFilters: updateBlockchainFilters 
  } = useBlockchainTransactionHistory({
    chain: activeChain ? [activeChain.id] : [137],
  });

  const {
    transactions: normalTransactions,
    isLoading: isLoadingNormal,
  } = useTransactionHistory();

  const dedupedBlockchain = deduplicateBlockchainTxs(normalTransactions || [], blockchainTransactions || []);

  // Combinar las transacciones
  const allTransactions = [
    ...(normalTransactions || []),
    ...dedupedBlockchain,
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const filteredTransactions = selectedFilter === "all" 
    ? allTransactions 
    : allTransactions.filter(tx => tx.type === selectedFilter);

  const isLoading = isLoadingBlockchain || isLoadingNormal;

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    const filterValue = filter === "all" ? [] : [filter as any];
    updateBlockchainFilters({ type: filterValue });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text font-editorial mb-2">Transaction History</h2>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">All your transactions in one view</p>
      </motion.div>

      {/* Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl p-4 md:p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter by type:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {[
              { value: "all", label: "All" },
              { value: "SEND", label: "Sends" },
              { value: "RECEIVE", label: "Receives" },
              { value: "BUY", label: "Buys" },
              { value: "SELL", label: "Sells" },
            ].map((filter) => (
              <motion.button
                key={filter.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  selectedFilter === filter.value
                    ? 'bg-lime-accent text-white shadow-lg'
                    : 'bg-light-glass dark:bg-dark-glass text-light-text dark:text-dark-text hover:bg-lime-accent/10'
                }`}
              >
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-accent"></div>
            <span className="ml-3 text-light-text dark:text-dark-text">Loading transactions...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-light-glass dark:bg-dark-glass rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-light-text-secondary dark:text-dark-text-secondary" />
            </div>
            <h3 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">No transactions</h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              {selectedFilter === "all" 
                ? "You don't have any transactions yet"
                : `No transactions of type "${typeLabels[selectedFilter]}"`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-light-border dark:divide-dark-border">
            {filteredTransactions.map((tx, index) => (
              <motion.div
                key={tx.id || tx.txHash}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-4 md:p-6 hover:bg-light-glass dark:hover:bg-dark-glass transition-colors duration-200"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${typeColors[tx.type]}`}>
                    {typeIcons[tx.type]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium border ${typeColors[tx.type]}`}>
                        {typeLabels[tx.type]}
                      </span>
                      <span className="text-xs md:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {tx.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Amount */}
                    <p className="text-base md:text-lg font-bold text-light-text dark:text-dark-text font-mono mb-1">
                      {typeof tx.amount === 'number' ? tx.amount.toFixed(6) : '0'} {tx.tokenSymbol || 'POL'}
                    </p>
                    
                    {/* Addresses */}
                    <div className="text-xs md:text-sm text-light-text-secondary dark:text-dark-text-secondary space-y-0.5 md:space-y-0 md:flex md:items-center md:gap-4">
                      <div>
                        <span className="font-medium">From:</span>{' '}
                        <span className="font-mono" title={tx.fromAddress}>
                          {truncateAddress(tx.fromAddress, 6, 4)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">To:</span>{' '}
                        <span className="font-mono" title={tx.toAddress}>
                          {truncateAddress(tx.toAddress, 6, 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-2 flex-shrink-0">
                    {tx.txHash && (
                      <motion.a
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        href={getExplorerTxUrlFromTx(tx, activeChain?.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-light-glass dark:bg-dark-glass rounded-lg hover:bg-lime-accent/10 transition-colors flex items-center justify-center"
                        title="View in explorer"
                      >
                        <Eye className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" />
                      </motion.a>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTx(tx)}
                      className="px-3 md:px-4 py-2 bg-lime-accent text-white rounded-lg hover:bg-lime-accent/90 transition-colors text-xs md:text-sm font-medium whitespace-nowrap"
                    >
                      <span className="md:hidden">Details</span>
                      <span className="hidden md:inline">View details</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={() => setSelectedTx(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-md w-full border border-light-border dark:border-dark-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-light-text dark:text-dark-text">Transaction Details</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Type:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${typeColors[selectedTx.type]}`}>
                    {typeIcons[selectedTx.type]}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${typeColors[selectedTx.type]}`}>
                    {typeLabels[selectedTx.type]}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Amount:</span>
                <p className="text-lg font-bold text-light-text dark:text-dark-text font-mono">
                  {(selectedTx.type === TransactionTypes.BUY || selectedTx.type === TransactionTypes.SELL) && selectedTx.baseAmount
                    ? selectedTx.type === TransactionTypes.BUY
                      ? `${Number(selectedTx.baseAmount).toFixed(6)} USDC → ${Number(selectedTx.amount).toFixed(6)} ${selectedTx.tokenSymbol || 'PXO'}`
                      : `${Number(selectedTx.amount).toFixed(6)} ${selectedTx.tokenSymbol || 'PXO'} → ${Number(selectedTx.baseAmount).toFixed(6)} USDC`
                    : `${formatAmount(selectedTx.amount)} ${selectedTx.tokenSymbol || 'POL'}`}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Date:</span>
                <p className="text-light-text dark:text-dark-text">
                  {selectedTx.timestamp.toLocaleString()}
                </p>
              </div>
              
              {selectedTx.txHash && (
                <div>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Hash:</span>
                  <a
                    href={getExplorerTxUrlFromTx(selectedTx, activeChain?.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lime-accent hover:text-lime-accent/80 font-mono text-sm break-all"
                  >
                    {selectedTx.txHash}
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

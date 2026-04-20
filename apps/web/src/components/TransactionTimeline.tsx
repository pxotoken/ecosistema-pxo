import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import { useBlockchainTransactionHistory } from "../hooks/useBlockchainTransactionHistory";
import { useActiveWalletChain } from "thirdweb/react";
import { getExplorerTxUrlFromTx } from '../lib/explorer';
import { deduplicateBlockchainTxs, formatAmount } from '../lib/transactionUtils';
import { HistoryItem, TransactionTypes } from "@pxo/shared/types";

// Transaction types
const TRANSACTION_STATUS = {
  SEND: "SEND",
  RECEIVE: "RECEIVE",
  BUY: "BUY",
  SELL: "SELL",
} as const;

type TransactionType = keyof typeof TRANSACTION_STATUS;

// Transaction categories configuration
const TRANSACTION_CATEGORIES = {
  SEND: {
    label: "Send",
    icon: ArrowUpRight,
    bgColor: "bg-red-500/20",
    iconColor: "text-red-400",
    badgeColor: "bg-red-500/20 text-red-400",
    getDescription: (address: string) => `Sent to ${address}`,
  },
  RECEIVE: {
    label: "Receive",
    icon: ArrowDownLeft,
    bgColor: "bg-lime-accent/20",
    iconColor: "text-lime-accent dark:text-dark-text",
    badgeColor: "bg-lime-accent/20 text-lime-accent",
    getDescription: (address: string) => `Received from ${address}`,
  },
  BUY: {
    label: "Buy",
    icon: TrendingUp,
    bgColor: "bg-blue-500/20",
    iconColor: "text-blue-400",
    badgeColor: "bg-blue-500/20 text-blue-400",
    getDescription: (tokenSymbol: string) => `Purchase of ${tokenSymbol}`,
  },
  SELL: {
    label: "Sell",
    icon: TrendingDown,
    bgColor: "bg-orange-500/20",
    iconColor: "text-orange-400",
    badgeColor: "bg-orange-500/20 text-orange-400",
    getDescription: (tokenSymbol: string) => `Sale of ${tokenSymbol}`,
  },
} as const;

const getTimeAgo = (date: Date) => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "A few seconds ago";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
};

const formatAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getIconBg = (type: TransactionType) => {
  return TRANSACTION_CATEGORIES[type].bgColor;
};

const getIcon = (type: TransactionType, size: string = "w-5 h-5") => {
  const category = TRANSACTION_CATEGORIES[type];
  const Icon = category.icon;
  return <Icon className={`${size} ${category.iconColor}`} />;
};

const getDescription = (
  type: TransactionType,
  toAddress: string,
  fromAddress: string,
  tokenSymbol: string
) => {
  const category = TRANSACTION_CATEGORIES[type];
  const param = (type === TRANSACTION_STATUS.SEND || type === TRANSACTION_STATUS.RECEIVE)
    ? formatAddress(type === TRANSACTION_STATUS.SEND ? toAddress : fromAddress)
    : tokenSymbol;
  
  return category.getDescription(param);
};

const getAmountSign = (type: string) => {
  return type === TRANSACTION_STATUS.RECEIVE || type === TRANSACTION_STATUS.BUY ? "+" : "-";
};

const getAmountColor = (type: string) => {
  return type === TRANSACTION_STATUS.RECEIVE || type === TRANSACTION_STATUS.BUY
    ? "text-lime-accent dark:text-dark-text"
    : "text-light-text dark:text-dark-text";
};

interface TransactionTimelineProps {
  onNavigateToHistory?: () => void;
}

export const TransactionTimeline: React.FC<TransactionTimelineProps> = ({
  onNavigateToHistory,
}) => {
  const activeChain = useActiveWalletChain();
  const [selectedTx, setSelectedTx] = useState<HistoryItem | null>(null);

  const {
    transactions: blockchainTransactions,
    isLoading: isLoadingBlockchain,
  } = useBlockchainTransactionHistory({
    chain: activeChain ? [activeChain.id] : [137],
  });

  const { transactions: normalTransactions, isLoading: isLoadingNormal } =
    useTransactionHistory();

  const dedupedBlockchain = deduplicateBlockchainTxs(normalTransactions || [], blockchainTransactions || []);

  const allTransactions = [
    ...(normalTransactions || []),
    ...dedupedBlockchain,
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  const isLoading = isLoadingBlockchain || isLoadingNormal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text font-editorial">
          Recent Activity
        </h2>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
          Your latest transactions across all currencies
        </p>
      </motion.div>

      {/* Transaction List */}
      <div className="bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-glass transition-colors duration-300">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              No recent transactions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {allTransactions.map((transaction, index) => {
              const iconBg = getIconBg(transaction.type);
              const icon = getIcon(transaction.type);
              const description = getDescription(
                transaction.type,
                transaction.toAddress,
                transaction.fromAddress,
                transaction.tokenSymbol
              );
              const amountSign = getAmountSign(transaction.type);
              const amountColor = getAmountColor(transaction.type);

              const amountElement = (textSize: string) => (
                <motion.p
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                  className={`font-bold font-editorial ${textSize} ${amountColor}`}
                >
                  {amountSign}
                  {transaction.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}{" "}
                  <span className="font-sans">{transaction.tokenSymbol}</span>
                </motion.p>
              );

              const timeElement = (textSize: string) => (
                <p
                  className={`${textSize} text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap`}
                >
                  {getTimeAgo(transaction.timestamp)}
                </p>
              );

              const descriptionElement = (textSize: string) => (
                <p
                  className={`font-medium ${textSize} text-light-text dark:text-dark-text ${
                    textSize === "text-sm" ? "" : "font-editorial"
                  } truncate`}
                >
                  {description}
                </p>
              );

              const statusBadge = (
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      TRANSACTION_CATEGORIES[transaction.type].badgeColor
                    }`}
                  >
                    {TRANSACTION_CATEGORIES[transaction.type].label}
                  </span>
                  {transaction.status && (
                    <>
                      <span className="text-light-text-secondary dark:text-dark-text-secondary">
                        •
                      </span>
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary uppercase">
                        {transaction.status}
                      </span>
                    </>
                  )}
                </div>
              );

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01, x: 5 }}
                  onClick={() => setSelectedTx(transaction)}
                  className="flex items-center sm:items-start gap-4 sm:gap-5 px-2 py-3 sm:p-6 rounded-2xl sm:rounded-xl bg-transparent hover:bg-blue-600/10 dark:hover:bg-blue-400/10 transition-all group relative duration-300 cursor-pointer w-[calc(100%+1.5rem)] -ml-3 sm:w-auto sm:ml-0"
                >
                  <div className={`p-3 rounded-full shrink-0 ${iconBg}`}>
                    {icon}
                  </div>

                  {/* Mobile Layout */}
                  <div className="flex-1 min-w-0 sm:hidden space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      {amountElement("text-lg")}
                      {timeElement("text-base")}
                    </div>
                    {descriptionElement("text-sm")}
                    {statusBadge}
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:flex flex-1 min-w-0 items-center gap-5">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {descriptionElement("text-base font-editorial")}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-mono">
                          {transaction.txHash
                            ? formatAddress(transaction.txHash)
                            : "N/A"}
                        </p>
                        {statusBadge}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {amountElement("text-xl")}
                      {timeElement("text-xs")}
                    </div>
                  </div>

                  {/* Hover effect line */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileHover={{ width: "100%" }}
                    className="absolute bottom-0 left-0 h-px bg-lime-accent/30"
                  />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* View More Button */}
        {!isLoading && allTransactions.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNavigateToHistory}
            className="w-full mt-6 py-3 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-xl text-light-text dark:text-dark-text hover:border-lime-accent/30 hover:text-lime-accent transition-all font-medium duration-300"
          >
            View All Transactions
          </motion.button>
        )}
      </div>

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
              <h3 className="text-lg font-bold text-light-text dark:text-dark-text">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Type:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBg(
                      selectedTx.type
                    )}`}
                  >
                    {getIcon(selectedTx.type, "w-4 h-4")}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      TRANSACTION_CATEGORIES[selectedTx.type].badgeColor
                    }`}
                  >
                    {TRANSACTION_CATEGORIES[selectedTx.type].label}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Amount:
                </span>
                <p className="text-lg font-bold text-light-text dark:text-dark-text font-mono">
                  {(selectedTx.type === TransactionTypes.BUY || selectedTx.type === TransactionTypes.SELL) && selectedTx.baseAmount
                    ? selectedTx.type === TransactionTypes.BUY
                      ? `${Number(selectedTx.baseAmount).toFixed(6)} USDC → ${Number(selectedTx.amount).toFixed(6)} ${selectedTx.tokenSymbol || 'PXO'}`
                      : `${Number(selectedTx.amount).toFixed(6)} ${selectedTx.tokenSymbol || 'PXO'} → ${Number(selectedTx.baseAmount).toFixed(6)} USDC`
                    : `${formatAmount(selectedTx.amount)} ${selectedTx.tokenSymbol}`}
                </p>
              </div>

              <div>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Date:
                </span>
                <p className="text-light-text dark:text-dark-text">
                  {selectedTx.timestamp.toLocaleString()}
                </p>
              </div>

              {selectedTx.fromAddress && (
                <div>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    From:
                  </span>
                  <p className="text-light-text dark:text-dark-text font-mono text-sm break-all">
                    {selectedTx.fromAddress}
                  </p>
                </div>
              )}

              {selectedTx.toAddress && (
                <div>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    To:
                  </span>
                  <p className="text-light-text dark:text-dark-text font-mono text-sm break-all">
                    {selectedTx.toAddress}
                  </p>
                </div>
              )}

              {selectedTx.txHash && (
                <div>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Hash:
                  </span>
                  <a
                    href={getExplorerTxUrlFromTx(selectedTx, activeChain?.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lime-accent hover:text-lime-accent/80 font-mono text-sm break-all block"
                  >
                    {selectedTx.txHash}
                  </a>
                </div>
              )}

              {selectedTx.status && (
                <div>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Status:
                  </span>
                  <p className="text-light-text dark:text-dark-text">
                    {selectedTx.status}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

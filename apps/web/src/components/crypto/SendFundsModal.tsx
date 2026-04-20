import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  ChevronDown,
  Loader2,
  Search,
} from 'lucide-react';
import { useActiveAccount, useActiveWallet, useActiveWalletChain } from 'thirdweb/react';
import { createPortal } from 'react-dom';
import useWalletStore from '../../store/useWalletStore';
import { getThirdwebClient } from '../../lib/client';
import { useSendToken } from '../../hooks/useSendToken';
import { WalletSignatureBanner } from '../ui/WalletSignatureBanner';
import { isExternalAuthProvider, isNonCustodialWallet } from '../../lib/walletUtils';
import { useAuthContext } from '../../contexts/AuthContext';

const client = getThirdwebClient();
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface Token {
  address: string;
  name: string;
  symbol: string;
  icon: string;
}

interface SendFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Screen = 'form' | 'token-selector' | 'success' | 'error';

function formatBalance(value: string, decimals = 6): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  if (num < 0.000001) return '< 0.000001';
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

export const SendFundsModal: React.FC<SendFundsModalProps> = ({ isOpen, onClose }) => {
  const [screen, setScreen] = useState<Screen>('form');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const wallet = useActiveWallet();
  const { user } = useAuthContext();
  const isNonCustodial = isNonCustodialWallet(wallet);
  const [signatureSecondsLeft, setSignatureSecondsLeft] = useState<number | null>(null);
  const { tokens } = useWalletStore();
  const { send, reset, fetchBalance, status, error, txHash, isPending, isSuccess, isError } = useSendToken();

  const availableTokens: Token[] = activeChain && activeChain.id in tokens
    ? tokens[activeChain.id]
    : [];

  useEffect(() => {
    if (isOpen) {
      setScreen('form');
      setReceiverAddress('');
      setAmount('');
      setBalance(null);
      setSearchQuery('');
      reset();

      if (availableTokens.length > 0 && !selectedToken) {
        const nonNative = availableTokens.find(t => t.address !== ZERO_ADDRESS);
        setSelectedToken(nonNative || availableTokens[0]);
      }
    }
  }, [isOpen, activeChain?.id]);

  useEffect(() => {
    if (isSuccess) setScreen('success');
    if (isError) setScreen('error');
  }, [isSuccess, isError]);

  const loadBalance = useCallback(async () => {
    if (!selectedToken || !account) return;
    setBalanceLoading(true);
    try {
      const result = await fetchBalance(
        selectedToken.address === ZERO_ADDRESS ? undefined : selectedToken.address
      );
      setBalance(result?.displayValue || '0');
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [selectedToken, account, activeChain?.id]);

  useEffect(() => {
    if (isOpen && selectedToken) {
      loadBalance();
    }
  }, [selectedToken, isOpen, loadBalance]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSend = async () => {
    if (!selectedToken || !receiverAddress || !amount) return;

    setSignatureSecondsLeft(null);
    await send({
      receiverAddress,
      amount,
      tokenAddress: selectedToken.address === ZERO_ADDRESS ? undefined : selectedToken.address,
      onSignatureCountdown: isExternalAuthProvider(user, wallet)
        ? (s) => setSignatureSecondsLeft(s)
        : undefined,
    });
  };

  const handleSelectToken = (token: Token) => {
    setSelectedToken(token);
    setAmount('');
    setScreen('form');
  };

  const handleSetMax = () => {
    if (balance) {
      const maxAmount = selectedToken?.address === ZERO_ADDRESS
        ? Math.max(0, parseFloat(balance) - 0.01).toString()
        : balance;
      setAmount(maxAmount);
    }
  };

  const handleRestart = () => {
    setReceiverAddress('');
    setAmount('');
    setBalance(null);
    reset();
    setScreen('form');
    loadBalance();
  };

  const filteredTokens = searchQuery
    ? availableTokens.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableTokens;

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(receiverAddress);
  const numAmount = parseFloat(amount);
  const hasInsufficientBalance = balance !== null && numAmount > parseFloat(balance);
  const canSend = isValidAddress && numAmount > 0 && !hasInsufficientBalance && !isPending;

  const getExplorerUrl = (hash: string) => {
    if (!activeChain) return '';
    if (activeChain.id === 56) return `https://bscscan.com/tx/${hash}`;
    if (activeChain.id === 137) return `https://polygonscan.com/tx/${hash}`;
    if (activeChain.id === 80002) return `https://amoy.polygonscan.com/tx/${hash}`;
    return `https://etherscan.io/tx/${hash}`;
  };

  const renderForm = () => (
    <div className="p-6 space-y-5">
      {/* Token Selector */}
      <div>
        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
          Token
        </label>
        <button
          onClick={() => setScreen('token-selector')}
          className="w-full flex items-center justify-between p-3 bg-light-glass dark:bg-dark-glass rounded-xl border border-light-border dark:border-dark-border hover:border-lime-accent/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {selectedToken && (
              <>
                <img
                  src={selectedToken.icon}
                  alt={selectedToken.symbol}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="text-left">
                  <p className="text-sm font-medium text-light-text dark:text-dark-text">
                    {selectedToken.name}
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    {balanceLoading ? 'Loading...' : balance !== null ? `${formatBalance(balance)} ${selectedToken.symbol}` : ''}
                  </p>
                </div>
              </>
            )}
          </div>
          <ChevronDown size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
        </button>
      </div>

      {/* Receiver Address */}
      <div>
        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
          Send to
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={receiverAddress}
          onChange={(e) => setReceiverAddress(e.target.value)}
          className={`w-full p-3 bg-light-glass dark:bg-dark-glass rounded-xl border transition-colors text-light-text dark:text-dark-text placeholder-light-text-secondary/50 dark:placeholder-dark-text-secondary/50 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-lime-accent ${
            receiverAddress && !isValidAddress
              ? 'border-red-500'
              : 'border-light-border dark:border-dark-border'
          }`}
        />
        {receiverAddress && !isValidAddress && (
          <p className="text-xs text-red-500 mt-1">Invalid address</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
            Amount
          </label>
          {balance !== null && (
            <button
              onClick={handleSetMax}
              className="text-xs text-lime-accent hover:text-lime-accent/80 transition-colors font-medium"
            >
              MAX
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
            className={`w-full p-3 pr-20 bg-light-glass dark:bg-dark-glass rounded-xl border transition-colors text-light-text dark:text-dark-text placeholder-light-text-secondary/50 dark:placeholder-dark-text-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-lime-accent ${
              hasInsufficientBalance
                ? 'border-red-500'
                : 'border-light-border dark:border-dark-border'
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium">
            {selectedToken?.symbol}
          </span>
        </div>
        {hasInsufficientBalance && (
          <p className="text-xs text-red-500 mt-1">Insufficient balance</p>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
          canSend
            ? 'bg-lime-accent text-white hover:bg-lime-accent/90 shadow-lg hover:shadow-xl'
            : 'bg-light-glass dark:bg-dark-glass text-light-text-secondary dark:text-dark-text-secondary cursor-not-allowed'
        }`}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {status === 'confirming' ? 'Confirming...' : 'Sending...'}
          </>
        ) : (
          <>
            <Send size={16} />
            Send
          </>
        )}
      </button>

      {isNonCustodial && status === 'sending' && (
        <WalletSignatureBanner
          secondsLeft={
            isExternalAuthProvider(user, wallet) ? signatureSecondsLeft ?? undefined : undefined
          }
        />
      )}
    </div>
  );

  const renderTokenSelector = () => (
    <div className="flex flex-col max-h-[70vh]">
      <div className="p-4 border-b border-light-border dark:border-dark-border">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary" />
          <input
            type="text"
            placeholder="Search token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-light-glass dark:bg-dark-glass rounded-xl border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text placeholder-light-text-secondary/50 dark:placeholder-dark-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-lime-accent"
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-4 space-y-1">
        {filteredTokens.map((token) => (
          <TokenRow
            key={token.address}
            token={token}
            isSelected={selectedToken?.address === token.address}
            onClick={() => handleSelectToken(token)}
          />
        ))}
        {filteredTokens.length === 0 && (
          <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary py-8">
            No tokens found
          </p>
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[280px] space-y-4">
      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
        <CheckCircle size={32} className="text-green-500" />
      </div>
      <p className="text-lg font-semibold text-light-text dark:text-dark-text">
        Transaction Sent
      </p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary text-center">
        {amount} {selectedToken?.symbol} sent successfully
      </p>
      {txHash && (
        <a
          href={getExplorerUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-lime-accent hover:underline font-mono"
        >
          View on Explorer
        </a>
      )}
      <div className="flex gap-3 w-full pt-2">
        <button
          onClick={handleRestart}
          className="flex-1 py-2.5 px-4 rounded-xl border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
        >
          Send More
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 px-4 rounded-xl bg-lime-accent text-white text-sm font-medium hover:bg-lime-accent/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[280px] space-y-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
        <XCircle size={32} className="text-red-500" />
      </div>
      <p className="text-lg font-semibold text-light-text dark:text-dark-text">
        Transaction Failed
      </p>
      <p className="text-sm text-red-400 text-center max-w-[280px] break-words">
        {error}
      </p>
      <button
        onClick={handleRestart}
        className="w-full py-2.5 px-4 rounded-xl bg-lime-accent text-white text-sm font-medium hover:bg-lime-accent/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  const getHeaderTitle = () => {
    if (screen === 'token-selector') return 'Select Token';
    if (screen === 'success') return 'Success';
    if (screen === 'error') return 'Error';
    return 'Send Funds';
  };

  const handleBack = () => {
    if (screen === 'token-selector') {
      setScreen('form');
      setSearchQuery('');
    } else {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-[400px] max-h-[90vh] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden border border-light-border dark:border-dark-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border bg-gradient-to-br from-lime-accent/10 to-lime-accent/5">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBack}
                  className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-base font-semibold text-light-text dark:text-dark-text">
                  {getHeaderTitle()}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            {screen === 'form' && renderForm()}
            {screen === 'token-selector' && renderTokenSelector()}
            {screen === 'success' && renderSuccess()}
            {screen === 'error' && renderError()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};

interface TokenRowProps {
  token: Token;
  isSelected: boolean;
  onClick: () => void;
}

const TokenRow: React.FC<TokenRowProps> = ({ token, isSelected, onClick }) => {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!account || !activeChain || !client) return;

    const load = async () => {
      try {
        const { getWalletBalance } = await import('thirdweb/wallets');
        const { getBalance } = await import('thirdweb/extensions/erc20');

        let result;
        if (token.address === ZERO_ADDRESS) {
          result = await getWalletBalance({ address: account.address, client, chain: activeChain });
        } else {
          result = await getBalance({
            contract: { client, address: token.address as `0x${string}`, chain: activeChain },
            address: account.address,
          });
        }
        setBalance(result.displayValue);
      } catch {
        setBalance(null);
      }
    };

    load();
  }, [token.address, account?.address, activeChain?.id]);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-150 ${
        isSelected
          ? 'bg-lime-accent/10 border border-lime-accent/30'
          : 'hover:bg-light-glass dark:hover:bg-dark-glass border border-transparent'
      }`}
    >
      <div className="flex items-center space-x-3">
        <img
          src={token.icon}
          alt={token.symbol}
          className="w-8 h-8 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="text-left">
          <p className="text-sm font-medium text-light-text dark:text-dark-text">
            {token.name}
          </p>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {token.symbol}
          </p>
        </div>
      </div>
      <div className="text-right">
        {balance !== null ? (
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {formatBalance(balance)}
          </p>
        ) : (
          <div className="w-16 h-4 bg-light-glass dark:bg-dark-glass rounded animate-pulse" />
        )}
      </div>
    </button>
  );
};

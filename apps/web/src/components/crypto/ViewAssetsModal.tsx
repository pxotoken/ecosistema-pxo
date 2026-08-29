import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getBalance } from 'thirdweb/extensions/erc20';
import { getWalletBalance } from 'thirdweb/wallets';
import { getThirdwebClient } from '../../lib/client';
import useWalletStore from '../../store/useWalletStore';
import { createPortal } from 'react-dom';

const client = getThirdwebClient();

interface ViewAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenBalance {
  address: string;
  name: string;
  symbol: string;
  icon: string;
  balance: string;
  formattedBalance: string;
}

export const ViewAssetsModal: React.FC<ViewAssetsModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { tokens } = useWalletStore();

  const availableTokens = activeChain && activeChain.id in tokens ? tokens[activeChain.id] : [];

  useEffect(() => {
    if (isOpen && account && activeChain) {
      fetchBalances();
    }
  }, [isOpen, account, activeChain]);

  const fetchBalances = async () => {
    if (!account || !activeChain) return;

    setLoading(true);
    const tokenBalances: TokenBalance[] = [];

    try {
      // Obtener balance nativo
      const nativeBalance = await getWalletBalance({
        client,
        address: account.address,
        chain: activeChain,
      });

      const nativeToken = availableTokens.find(token => 
        token.address === "0x0000000000000000000000000000000000000000"
      );

      if (nativeToken) {
        tokenBalances.push({
          address: nativeToken.address,
          name: nativeToken.name,
          symbol: nativeToken.symbol,
          icon: nativeToken.icon,
          balance: nativeBalance.value.toString(),
          formattedBalance: nativeBalance.displayValue,
        });
      }

      // Obtener balances de tokens ERC20
      for (const token of availableTokens) {
        if (token.address !== "0x0000000000000000000000000000000000000000") {
          try {
            const balance = await getBalance({
              // Token addresses come from the chain config as plain strings.
              contract: {
                client,
                address: token.address as `0x${string}`,
                chain: activeChain,
              },
              address: account.address,
            });

            tokenBalances.push({
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              icon: token.icon,
              balance: balance.value.toString(),
              formattedBalance: balance.displayValue,
            });
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
          }
        }
      }

      setBalances(tokenBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard");
    }).catch(() => {
      alert("Error copying");
    });
  };

  const getExplorerUrl = (address: string) => {
    if (!activeChain) return '';
    
      const chainId = activeChain.id;
  if (chainId === 56) return `https://bscscan.com/address/${address}`;
  if (chainId === 137) return `https://polygonscan.com/address/${address}`;
  if (chainId === 80002) return `https://amoy.polygonscan.com/address/${address}`;
    
    return `https://etherscan.io/address/${address}`;
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
            className="w-[500px] max-h-[90vh] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-y-auto border border-light-border dark:border-dark-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-lime-accent/10 to-lime-accent/5 border-b border-light-border dark:border-dark-border">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center">
                <button
                  onClick={onClose}
                  className="mr-3 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                  View Funds
                </h2>
              </div>
              
              {account && (
                <div className="mt-4">
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Wallet Address
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-mono text-light-text dark:text-dark-text">
                      {account.address.slice(0, 10)}...{account.address.slice(-8)}
                    </p>
                    <button
                      onClick={() => copyToClipboard(account.address)}
                      className="text-light-text-secondary dark:text-dark-text-secondary hover:text-lime-accent dark:hover:text-dark-text transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      href={getExplorerUrl(account.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-light-text-secondary dark:text-dark-text-secondary hover:text-lime-accent dark:hover:text-dark-text transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-accent"></div>
                  <span className="ml-3 text-light-text dark:text-dark-text">Loading balances...</span>
                </div>
              ) : balances.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    No tokens found on this network
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {balances.map((token) => (
                    <div
                      key={token.address}
                      className="flex items-center justify-between p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-light-border dark:border-dark-border"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png';
                          }}
                        />
                        <div>
                          <p className="font-medium text-light-text dark:text-dark-text">
                            {token.name}
                          </p>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            {token.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-light-text dark:text-dark-text">
                          {parseFloat(token.formattedBalance).toFixed(4)} {token.symbol}
                        </p>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          ≈ ${(parseFloat(token.formattedBalance) * 1).toFixed(2)} USD
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Usar portal para renderizar fuera del DOM normal
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}; 
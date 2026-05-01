import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Download,
  List,
  Clock,
  Wallet,
  LogOut,
  User,
  Copy,
  Network,
} from 'lucide-react';
import {
  useWalletDetailsModal,
  useActiveWallet,
  useActiveAccount,
  useNetworkSwitcherModal,
  useActiveWalletChain,
} from 'thirdweb/react';
import { getThirdwebClient } from '../../lib/client';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useNavigate } from 'react-router-dom';
import useWalletStore from '../../store/useWalletStore';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { KYCStatus } from '@pxo/shared/types';
import { SendFundsModal } from './SendFundsModal';
import { PATHS } from '../../routes/paths';

const client = getThirdwebClient();

const networkLogos = {
  56: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png",
  137: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png",
  80002: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png",
};

const networkNames = {
  56: "BNB Chain",
  137: "Polygon",
  80002: "Polygon Amoy",
};

const NetworkIcon: React.FC<{ chainId: number }> = ({ chainId }) => {
  const [imageError, setImageError] = useState(false);
  
  const logoUrl = networkLogos[chainId as keyof typeof networkLogos];
  
  if (!logoUrl || imageError) {
    return <Network className="w-4 h-4 mr-2" />;
  }
  
  return (
    <img
      src={logoUrl}
      alt="Network Logo"
      className="w-4 h-4 mr-2 rounded-full"
      onError={() => setImageError(true)}
    />
  );
};

const getNetworkIcon = (chainId: number | undefined) => {
  if (!chainId) return Network;
  
  return () => <NetworkIcon chainId={chainId} />;
};

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const networkSwitcher = useNetworkSwitcherModal();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { open } = useWalletDetailsModal();
  const { currentChains, tokens, environment } = useWalletStore();
  const { logout, user } = useAuthContext();
  const { addToast } = useToast();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  
  const supportedTokens: any = useMemo(() => {
    const _supportedTokens = Object.fromEntries(
      Object.entries(tokens).map(([networkId, networkTokens]) => [
        networkId,
        networkTokens.filter(
          ({ address }: any) =>
            address !== "0x0000000000000000000000000000000000000000"
        ),
      ])
    );

    return _supportedTokens;
  }, [tokens]);

  // Manejar el scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const copyToClipboard = () => {
    if (account?.address) {
      const address = account.address;
      navigator.clipboard
        .writeText(address)
        .then(() => {
          addToast({
            type: 'success',
            title: 'Address copied',
            description: 'Wallet address has been copied to clipboard',
          });
        })
        .catch(() => {
          addToast({
            type: 'error',
            title: 'Error al copiar',
            description: 'Could not copy address to clipboard',
          });
        });
    }
  };

  function switchNetwork() {
    networkSwitcher.open({
      client,
      theme: "dark",
      locale: "es_ES",
      sections: [{ label: "currentChains", chains: currentChains as any, }],
    });
  }

  const handleDisconnect = () => {
    logout();
    onClose();
  };

  const buttons = useMemo(
    () => [
      {
        icon: Send,
        text: "Send",
        onClick: () => {
          if (user?.KYC_status !== KYCStatus.VALIDATED) {
            addToast({
              type: 'error',
              title: 'KYC not validated',
              description: 'You must complete and validate your KYC to be able to send tokens. Go to Settings to complete your verification.',
            });
            onClose();
            navigate(PATHS.dashboard.settings);
            return;
          }
          setIsSendModalOpen(true);
        },
      },
      {
        icon: Download,
        text: "Receive",
        onClick: () =>
          open({
            client,
            initialScreen: "receive",
            locale: "es_ES",
            chains: currentChains,
            supportedTokens,
          } as any),
      },
    ],
    [open, currentChains, supportedTokens, user, addToast, onClose, navigate]
  );

  const menuItems = useMemo(
    () => [
      {
        icon: activeChain && activeChain.id in networkLogos
          ? getNetworkIcon(activeChain.id)
          : Network,
        text: `Select Network (${
          activeChain &&
          activeChain.id in networkLogos &&
          networkNames[activeChain.id as keyof typeof networkNames]
        })`,
        onClick: () => switchNetwork(),
      },
      {
        icon: List,
        text: "Transactions",
        onClick: () => {
          onClose();
          navigate(PATHS.dashboard.insights);
        },
      },
      // {
      //   icon: Clock,
      //   text: "View Funds",
      //   onClick: () => {
      //     onClose();
      //     (open as any)({
      //       chains: currentChains as any,
      //       supportedTokens: supportedTokens,
      //       initialScreen: "view-assets"
      //     });
      //   },
      // },
      {
        icon: User,
        text: "Verify KYC",
        onClick: () => {
          navigate(PATHS.dashboard.settings);
          onClose();
        },
      },
     /*  {
        icon: Banknote,
        text: "Bank Details",
        onClick: () => {
          window.location.href = "/inicio/bank-accounts";
        },
      }, */
    ],
    [activeChain, open, currentChains, supportedTokens]
  );

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
            className="w-[358px] max-h-[90vh] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-y-auto border border-light-border dark:border-dark-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-lime-accent/10 to-lime-accent/5">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-lime-accent to-lime-accent/80 rounded-2xl mb-4 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-2">
                  Connected Wallet
                </p>
                <div className="flex items-center">
                  <h2 className="text-light-text dark:text-dark-text font-mono text-sm mb-1">
                    {account?.address &&
                      account?.address.slice(0, 10) +
                        "..." +
                        account?.address.slice(-5)}
                  </h2>
                  <button
                    className="text-light-text-secondary dark:text-dark-text-secondary ml-2 cursor-pointer hover:text-lime-accent dark:hover:text-dark-text transition-colors"
                    onClick={copyToClipboard}
                    title="Copy address"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 flex space-x-3">
              {buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={button.onClick}
                  className="flex-1 bg-lime-accent text-white text-sm font-medium py-3 px-4 rounded-xl hover:bg-lime-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="flex items-center justify-center">
                    <button.icon size={16} className="mr-2" />
                    {button.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="px-6 py-4">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="w-full text-left px-4 py-3 text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass rounded-xl transition-all duration-200 mb-1"
                >
                  <span className="flex items-center">
                    <item.icon size={18} className="mr-3 text-light-text-secondary dark:text-dark-text-secondary" />
                    {item.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Disconnect Button */}
            <div className="px-6 py-4 border-t border-light-border dark:border-dark-border">
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
              >
                <span className="flex items-center">
                  <LogOut size={18} className="mr-3" />
                  Disconnect Wallet
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return (
      <>
        {createPortal(modalContent, document.body)}
        <SendFundsModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
        />
      </>
    );
  }
  
  return null;
}; 
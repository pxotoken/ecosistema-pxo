import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, ArrowLeftRight, Plus, User } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { useAuthContext } from '../contexts/AuthContext';
import { BuyOptionsModal } from './fiat/BuyOptionsModal';
import { NetworkBadge } from './NetworkBadge';
import { PATHS } from '../routes/paths';

interface TopBarProps {
  onToggleMobileMenu?: () => void;
  showMobileMenuButton?: boolean;
}

function truncateAddress(addr?: string | null): string {
  if (!addr) return 'Account';
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2 px-1 py-2 text-sm transition-colors border-b-2',
    isActive
      ? 'text-pxo-primary border-pxo-primary'
      : 'text-light-text dark:text-dark-text border-transparent hover:text-pxo-primary',
  ].join(' ');

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileMenu, showMobileMenuButton = false }) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [showBuyModal, setShowBuyModal] = useState(false);

  const profileLabel = truncateAddress(user?.wallet_address);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-glass border-b border-light-border dark:border-dark-border px-4 lg:px-8 sticky top-0 z-50 transition-colors duration-300 w-full"
    >
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          {showMobileMenuButton && (
            <button
              onClick={onToggleMobileMenu}
              aria-label="Toggle menu"
              className="lg:hidden p-2 rounded-lg hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
            >
              <Menu className="w-6 h-6 text-light-text dark:text-dark-text" />
            </button>
          )}
          <button
            onClick={() => navigate(PATHS.dashboard.wallet)}
            aria-label="Home"
            className="flex items-center"
          >
            <img
              src="/LOGO_DARK.png"
              alt="PXO"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/LOGO_1.png"
              alt="PXO"
              className="h-8 w-auto hidden dark:block"
            />
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink to={PATHS.dashboard.wallet} className={navItemClass}>
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transactions</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="flex items-center gap-2 px-1 py-2 text-sm transition-colors border-b-2 text-light-text dark:text-dark-text border-transparent hover:text-pxo-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Buy</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <NetworkBadge className="hidden sm:inline-flex" />
          <ThemeToggle />

          <NavLink
            to={PATHS.dashboard.settings}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-1 py-2 text-sm transition-colors border-b-2',
                isActive
                  ? 'text-pxo-primary border-pxo-primary'
                  : 'text-light-text dark:text-dark-text border-transparent hover:text-pxo-primary',
              ].join(' ')
            }
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline font-mono">{profileLabel}</span>
          </NavLink>
        </div>
      </div>

      <BuyOptionsModal open={showBuyModal} onClose={() => setShowBuyModal(false)} />
    </motion.div>
  );
};

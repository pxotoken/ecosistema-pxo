import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet, TrendingUp, Send, BarChart3, Settings, ChevronLeft, ChevronRight, Package, Shield, Users } from 'lucide-react';
import { KYCStatus } from '@pxo/shared/types';
import { PATHS } from '../routes/paths';
import '../styles/customScrollbar.css';

interface SidebarProps {
  user?: any;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
  onTransfersClick?: () => void;
}

const navigation = [
  { id: 'wallet', label: 'Wallet', icon: Wallet, path: PATHS.dashboard.wallet },
  { id: 'exchange', label: 'Exchange', icon: TrendingUp, path: PATHS.dashboard.exchange },
  { id: 'products', label: 'Products', icon: Package, path: PATHS.dashboard.products },
  { id: 'transfers', label: 'Transfers', icon: Send, path: null },
  { id: 'insights', label: 'History', icon: BarChart3, path: PATHS.dashboard.insights },
  { id: 'settings', label: 'Settings', icon: Settings, path: PATHS.dashboard.settings },
];

const adminNavigation = [
  { id: 'admin-kyc', label: 'KYC Admin', icon: Shield, path: PATHS.dashboard.adminKyc },
  { id: 'admin-users', label: 'Users', icon: Users, path: PATHS.dashboard.adminUsers },
  { id: 'admin-wallet-status', label: 'Wallet Status', icon: Wallet, path: PATHS.dashboard.adminWalletStatus },
  { id: 'admin-pricing-rules', label: 'Pricing Rules', icon: TrendingUp, path: PATHS.dashboard.adminPricingRules },
];

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isMobileMenuOpen = false,
  onCloseMobileMenu,
  onTransfersClick,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.user_type?.includes('989e3702-b515-4d6e-8627-fa0142a1a88f') ||
    user?.mail === 'admin@pxo.com';

  const isActive = (path: string | null) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const handleNavigationClick = (item: typeof navigation[0]) => {
    if (item.id === 'transfers') {
      onTransfersClick?.();
    } else if (item.path) {
      navigate(item.path);
    }
    onCloseMobileMenu?.();
  };

  return (
    <>
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCloseMobileMenu}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      <motion.div
        initial={{ width: 280 }}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`bg-light-surface dark:bg-dark-surface backdrop-blur-glass border-r border-light-border dark:border-dark-border flex flex-col h-full transition-colors duration-300 fixed lg:relative z-50 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className="hidden lg:flex px-4 py-4 border-b border-light-border dark:border-dark-border items-center justify-center relative">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex justify-center"
            >
              <div>
                <img src="/LOGO_DARK.png" alt="PXO Logo" className="h-10 w-auto dark:hidden" />
                <img src="/LOGO_1.png" alt="PXO Logo" className="h-10 w-auto hidden dark:block" />
              </div>
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex items-center justify-center p-2 rounded-full hover:bg-light-glass dark:hover:bg-dark-glass transition-colors ${
              isCollapsed ? 'relative' : 'absolute right-4'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-6 h-6 text-blue-600 dark:text-white" strokeWidth={3} />
            ) : (
              <ChevronLeft className="w-6 h-6 text-blue-600 dark:text-white" strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 pt-20 lg:pt-4 space-y-2 custom-scrollbar">
          {navigation.map((item) => {
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigationClick(item)}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all relative group ${
                  active
                    ? 'bg-pxo-primary/10'
                    : 'text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass hover:text-pxo-primary'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`relative ${active ? 'drop-shadow-glow' : ''}`}>
                  <item.icon className={`w-6 h-6 ${active ? 'text-pxo-primary dark:text-dark-text' : ''}`} />
                  {active && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-pxo-primary/20 rounded-full blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isCollapsed ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                    className={`font-medium font-editorial ${active ? 'text-pxo-primary dark:bg-pxo-gradient dark:text-transparent dark:bg-clip-text' : ''}`}
                  >
                    {item.label}
                  </motion.span>
                )}
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-0 w-1 h-8 bg-pxo-primary rounded-l-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isCollapsed ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-2"
                  >
                    <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                      Admin
                    </p>
                  </motion.div>
                )}
              </div>
              {adminNavigation.map((item) => {
                const active = isActive(item.path);
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => { navigate(item.path); onCloseMobileMenu?.(); }}
                    className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all relative group ${
                      active
                        ? 'bg-red-500/10'
                        : 'text-light-text dark:text-dark-text hover:bg-red-500/10 hover:text-red-500'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`relative ${active ? 'drop-shadow-glow' : ''}`}>
                      <item.icon className={`w-6 h-6 ${active ? 'text-red-500' : ''}`} />
                      {active && (
                        <motion.div
                          layoutId="adminActiveGlow"
                          className="absolute inset-0 bg-red-500/20 rounded-full blur-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 1 }}
                        animate={{ opacity: isCollapsed ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                        className={`font-medium font-editorial ${active ? 'text-red-500' : ''}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                    {active && (
                      <motion.div
                        layoutId="adminActiveIndicator"
                        className="absolute right-0 w-1 h-8 bg-red-500 rounded-l-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-light-border dark:border-dark-border">
          <div className="flex items-center space-x-3 p-3 bg-light-glass dark:bg-dark-glass rounded-xl">
            <div className="w-8 h-8 bg-pxo-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() :
                 user?.mail ? user.mail.charAt(0).toUpperCase() :
                 user?.wallet_address ? user.wallet_address.slice(2, 4).toUpperCase() : 'U'}
              </span>
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm font-medium text-light-text dark:text-dark-text">
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.first_name || user?.mail || 'Usuario'}
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  {user?.user_type?.includes('989e3702-b515-4d6e-8627-fa0142a1a88f') ? 'Admin' :
                   user?.KYC_status === KYCStatus.VALIDATED ? 'Verified Member' :
                   user?.KYC_status === KYCStatus.PENDING ? 'Pending Verification' :
                   'Standard Member'}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

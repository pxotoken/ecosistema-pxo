import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut, Settings, Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useActiveWallet } from 'thirdweb/react';
import { WalletModal } from './crypto';
import { useAuthContext } from '../contexts/AuthContext';

interface TopBarProps {
  onNavigateToSection?: (section: string) => void;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNavigateToSection, onToggleMobileMenu }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const wallet = useActiveWallet();
  const { user, logout } = useAuthContext();

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-glass border-b border-light-border dark:border-dark-border px-3 lg:px-8 py-3 lg:py-4 sticky top-0 z-50 transition-colors duration-300 w-full"
    >
      <div className="flex items-center justify-between lg:justify-between relative">
        {/* Left section */}
        <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
          >
            <Menu className="w-6 h-6 text-light-text dark:text-dark-text" />
          </motion.button>

          <div className="lg:hidden">
            <img 
              src="/LOGO_DARK.png" 
              alt="PXO Logo" 
              className="h-7 w-auto dark:hidden"
            />
            <img 
              src="/LOGO_1.png" 
              alt="PXO Logo" 
              className="h-7 w-auto hidden dark:block"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2 lg:space-x-6 flex-shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle />
        
        {/* Wallet indicator */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (wallet) {
                setShowWalletModal(true);
              } else {
                alert("No wallet connected");
              }
            }}
            className="w-8 h-8 lg:w-auto flex items-center justify-center lg:gap-2 bg-light-glass dark:bg-dark-glass lg:px-3 lg:py-2 rounded-full transition-colors duration-300 cursor-pointer hover:bg-light-glass/80 dark:hover:bg-dark-glass/80 border border-light-border dark:border-dark-border"
          >
            <Wallet className="w-4 h-4 text-pxo-primary dark:text-white" />
            <span className="hidden lg:inline text-xs text-light-text dark:text-dark-text">
              Wallet
            </span>
          </motion.button>
        </div>

        {/* Notifications */}
        {/* <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 bg-pxo-primary rounded-full flex items-center justify-center cursor-pointer shadow-glow"
        >
          <Bell className="w-5 h-5 text-light-text dark:text-dark-text" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"
          />
        </motion.button> */}

        {/* User avatar with dropdown */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-glow"
          >
            <span className="text-white font-bold text-xs lg:text-sm">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 
               user?.mail ? user.mail.charAt(0).toUpperCase() : 
               user?.wallet_address ? user.wallet_address.slice(2, 4).toUpperCase() : 'U'}
            </span>
          </motion.button>

          {/* User Menu Dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden z-50"
              >
                <div className="p-3 border-b border-light-border dark:border-dark-border">
                  <p className="text-sm font-medium text-light-text dark:text-dark-text">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user?.first_name || user?.mail || 'User'}
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    {user?.mail || 'No information'}
                  </p>
                </div>
                
                <div className="py-1">
       {/*            <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass transition-colors">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                   */}
                  <button 
                    onClick={() => onNavigateToSection?.('settings')}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                  
                  <button 
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay to close menu when clicking outside */}
          {showUserMenu && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowUserMenu(false)}
            />
          )}
        </div>
      </div>
      </div>
      
      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onNavigateToSection={onNavigateToSection}
      />
    </motion.div>
  );
};
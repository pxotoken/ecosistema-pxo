import React from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '../../contexts/AuthContext';

interface ConnectWalletButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
  onLogin?: () => void;
  onLogout?: () => void;
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({ 
  className = '', 
  variant = 'primary',
  onLogin,
  onLogout
}) => {
  const { isAuthenticated, loading, connect, logout } = useAuthContext();
  
  console.log("ConnectWalletButton - context:", { isAuthenticated, loading });

  const baseClasses = "px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-lime-accent hover:bg-lime-accent/90 text-white focus:ring-lime-accent/50",
    secondary: "bg-transparent border-2 border-lime-accent text-lime-accent dark:text-dark-text hover:bg-lime-accent hover:text-white focus:ring-lime-accent/50"
  };

  if (isAuthenticated) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={logout}
        disabled={loading}
        className={`${baseClasses} ${variantClasses[variant]} ${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Disconnecting...' : 'Disconnect Wallet'}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={connect}
      disabled={loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </motion.button>
  );
}; 
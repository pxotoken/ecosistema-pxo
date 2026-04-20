import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface AccedePXOButtonProps {
  onLogin?: () => void;
  className?: string;
}

export const AccedePXOButton: React.FC<AccedePXOButtonProps> = ({
  onLogin,
  className = ''
}) => {
  const { isAuthenticated, loading, connect } = useAuthContext();

  const handleClick = () => {
    if (isAuthenticated) {
      onLogin?.();
    } else {
      connect();
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={loading}
      className={`bg-white text-pxo-primary px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 shadow ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      Access PXO
      <ArrowRight className="w-4 h-4" />
    </motion.button>
  );
}; 
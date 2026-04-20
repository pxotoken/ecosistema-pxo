import React from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

interface WalletSignatureBannerProps {
  secondsLeft?: number | null;
}

export const WalletSignatureBanner: React.FC<WalletSignatureBannerProps> = ({ secondsLeft }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4"
  >
    <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-400 animate-pulse" />
    <div>
      <p className="text-sm font-semibold text-amber-400">Approval required in your wallet</p>
      <p className="text-xs text-amber-300/80 mt-0.5">
        Open your wallet app and confirm the transaction to continue
        {typeof secondsLeft === "number" && secondsLeft > 0 ? (
          <span className="block mt-1 font-semibold tabular-nums">
            Time left: {secondsLeft}s
          </span>
        ) : null}
      </p>
    </div>
  </motion.div>
);

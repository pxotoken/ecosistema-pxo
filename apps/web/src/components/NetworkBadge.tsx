import React from 'react';
import { useActiveWalletChain } from 'thirdweb/react';

const CHAIN_LABELS: Record<number, string> = {
  137: 'Polygon Mainnet',
  80002: 'Polygon Amoy',
  56: 'BNB Chain',
};

// Environment-declared expected chain. When the connected chain matches, the
// badge is green (all good). When it doesn't, the badge is amber to signal
// something is off — this shouldn't happen for in-app (social) wallets since
// they always land on the default chain, but external wallets (MetaMask etc)
// could be on any network.
const DEFAULT_CHAIN_ID = Number(import.meta.env.VITE_DEFAULT_CHAIN_ID) || 80002;

interface NetworkBadgeProps {
  /** Compact = icon + short label. Default = icon + full label. */
  compact?: boolean;
  className?: string;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ compact = false, className = '' }) => {
  const activeChain = useActiveWalletChain();
  if (!activeChain) return null;

  const chainId = activeChain.id;
  const label = CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
  const matchesExpected = chainId === DEFAULT_CHAIN_ID;

  const dotColor = matchesExpected ? 'bg-green-500' : 'bg-amber-500';
  const wrapperColor = matchesExpected
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';

  const displayLabel = compact ? (chainId === 137 ? 'Mainnet' : chainId === 80002 ? 'Amoy' : label) : label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${wrapperColor} ${className}`}
      title={matchesExpected ? label : `${label} — expected ${CHAIN_LABELS[DEFAULT_CHAIN_ID] ?? DEFAULT_CHAIN_ID}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {displayLabel}
    </span>
  );
};

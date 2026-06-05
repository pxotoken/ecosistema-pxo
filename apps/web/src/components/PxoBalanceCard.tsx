import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getBalance } from 'thirdweb/extensions/erc20';
import type { Chain } from 'thirdweb';
import { getThirdwebClient } from '../lib/client';
import useWalletStore from '../store/useWalletStore';

const client = getThirdwebClient();
const POLL_INTERVAL_MS = 5_000;

export function PxoBalanceCard() {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);

  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { tokens } = useWalletStore();

  const availableTokens = activeChain && activeChain.id in tokens ? tokens[activeChain.id] : [];
  const pxoToken = availableTokens.find((t) => t.symbol === 'PXO');

  useEffect(() => {
    let cancelled = false;

    const fetchBalance = async (withLoading: boolean) => {
      if (!account?.address || !pxoToken || !activeChain) {
        if (withLoading) setLoading(false);
        return;
      }
      if (withLoading) setLoading(true);
      try {
        const result = await getBalance({
          contract: { client, address: pxoToken.address as `0x${string}`, chain: activeChain as Chain },
          address: account.address,
        });
        if (!cancelled) setBalance(result.displayValue);
      } catch (err) {
        console.error('PxoBalanceCard: fetchBalance error', err);
      } finally {
        if (!cancelled && withLoading) setLoading(false);
      }
    };

    fetchBalance(true);
    const id = setInterval(() => fetchBalance(false), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [account?.address, pxoToken?.address, activeChain?.id]);

  const formatted = (() => {
    const n = parseFloat(balance);
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  })();

  return (
    <div className="w-full sm:w-11/12 md:w-5/6 lg:w-4/5 xl:w-3/4 2xl:w-1/2">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-glass relative overflow-hidden transition-colors duration-300 hover:border-lime-accent/40 hover:shadow-glow"
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-lime-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="flex-shrink-0">
            <img
              src="/LOGO_DARK.png"
              alt="PXO"
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain dark:hidden"
            />
            <img
              src="/LOGO_1.png"
              alt="PXO"
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain hidden dark:block"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary font-medium mb-1">
              PXO Balance
            </p>
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-bold text-pxo-primary dark:bg-pxo-gradient dark:text-transparent dark:bg-clip-text font-editorial break-all leading-none">
                {loading ? (
                  <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin" />
                ) : (
                  formatted
                )}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-pxo-primary dark:bg-pxo-gradient dark:text-transparent dark:bg-clip-text">
                PXO
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

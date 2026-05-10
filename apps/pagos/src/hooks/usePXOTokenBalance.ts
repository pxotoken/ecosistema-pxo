import { useCallback, useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getBalance } from 'thirdweb/extensions/erc20';

import { getThirdwebClient } from '../lib/thirdweb-client';
import { getPaymentsChain, getPxoTokenAddress, PAYMENTS_CHAIN_ID } from '../config/env';

export function formatPxoBalanceHome(displayBalance: string): {
  whole: string;
  cents: string;
  equivalent: string;
} {
  const n = Number.parseFloat(displayBalance.replaceAll(',', ''));
  if (!Number.isFinite(n)) {
    return { whole: '0', cents: '.00', equivalent: '$0.00 MXN' };
  }
  const fixed = n.toFixed(2);
  const [intRaw, decRaw = '00'] = fixed.split('.');
  const whole = Number(intRaw).toLocaleString('es-MX');
  const cents = `.${decRaw}`;
  const eqNum = Number(fixed).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return { whole, cents, equivalent: `$${eqNum} MXN` };
}

interface Options {
  enabled?: boolean;
  pollingInterval?: number;
}

export function usePXOTokenBalance(options: Options = {}) {
  const { enabled = true, pollingInterval = 5000 } = options;
  const account = useActiveAccount();
  const client = getThirdwebClient();
  const chain = getPaymentsChain();
  const tokenAddress = getPxoTokenAddress(PAYMENTS_CHAIN_ID);

  const [displayBalance, setDisplayBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(
    async (withLoading: boolean) => {
      if (!enabled || !client || !account?.address || !tokenAddress) {
        setLoading(false);
        setDisplayBalance('0');
        return;
      }

      if (withLoading) setLoading(true);

      try {
        const balanceResult = await getBalance({
          contract: {
            client,
            address: tokenAddress as `0x${string}`,
            chain,
          },
          address: account.address,
        });
        setDisplayBalance(balanceResult.displayValue);
        setError(null);
      } catch (err) {
        console.error('Error fetching PXO balance:', err);
        setError(err instanceof Error ? err.message : 'Error fetching balance');
        setDisplayBalance('0');
      } finally {
        setLoading(false);
      }
    },
    [enabled, client, account?.address, tokenAddress, chain],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void fetchBalance(true);
    const intervalId = setInterval(() => void fetchBalance(false), pollingInterval);
    return () => clearInterval(intervalId);
  }, [enabled, fetchBalance, pollingInterval]);

  return {
    displayBalance,
    loading,
    error,
    refetch: () => fetchBalance(true),
  };
}

import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getBalance } from 'thirdweb/extensions/erc20';
import { getWalletBalance } from 'thirdweb/wallets';
import { getThirdwebClient } from '../lib/client';
import { Chain } from 'thirdweb';

const client = getThirdwebClient();

interface UseTokenBalanceOptions {
  tokenAddress?: string;
  tokenSymbol?: string;
  pollingInterval?: number; // in milliseconds, default 5000
  enabled?: boolean; // allow disabling the hook
}

export const useTokenBalance = (options: UseTokenBalanceOptions = {}) => {
  const {
    tokenAddress,
    tokenSymbol,
    pollingInterval = 5000,
    enabled = true,
  } = options;

  const [balance, setBalance] = useState<number>(0);
  const [displayBalance, setDisplayBalance] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const account = useActiveAccount();
  const activeChain = useActiveWalletChain(); // Get active chain from wallet

  const fetchBalance = async (withLoading: boolean = true) => {
    if (!account?.address || !tokenAddress || !activeChain || !enabled) {
      setLoading(false);
      return;
    }

    if (withLoading) {
      setLoading(true);
    }

    try {
      let balanceResult;
      
      // Check if it's native token or ERC20
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        balanceResult = await getWalletBalance({
          address: account.address,
          client,
          chain: activeChain as Chain,
        });
      } else {
        balanceResult = await getBalance({
          contract: {
            client,
            address: tokenAddress as `0x${string}`,
            chain: activeChain as Chain,
          },
          address: account.address,
        });
      }

      setBalance(parseFloat(balanceResult.displayValue));
      setDisplayBalance(balanceResult.displayValue);
      setError(null);
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setError(err instanceof Error ? err.message : "Error fetching balance");
      setBalance(0);
      setDisplayBalance("0");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchBalance(true);
    const intervalId = setInterval(() => fetchBalance(false), pollingInterval);
    return () => clearInterval(intervalId);
  }, [account?.address, tokenAddress, activeChain?.id, pollingInterval, enabled]);

  return {
    balance, // number value for calculations
    displayBalance, // string value for display
    loading,
    error,
    refetch: () => fetchBalance(true),
    tokenSymbol,
    chainId: activeChain?.id,
  };
};

import { useEffect, useState } from 'react';
import { useActiveWalletChain } from 'thirdweb/react';
import api, { getApiError } from '../lib/api';

interface LiquidityToken {
  address: string | null;
  balance: number;
  decimals: number;
  symbol: string;
}

interface LiquidityData {
  chainId: number;
  chainName: string;
  pxo: LiquidityToken;
  stable: LiquidityToken;
}

export function useLiquidity() {
  const activeChain = useActiveWalletChain();
  const [data, setData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiquidity = async () => {
      if (!activeChain?.id) return;

      try {
        setLoading(true);
        setError(null);

        const { data: json } = await api.get(`/api/exchange/liquidity?chainId=${activeChain.id}`);
        if (!json.success || !json.liquidity) {
          throw new Error('Invalid liquidity response');
        }
        setData(json.liquidity as LiquidityData);
      } catch (err) {
        setError(getApiError(err, 'Failed to fetch liquidity'));
        console.error('Error fetching liquidity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiquidity();
  }, [activeChain?.id]);

  return {
    liquidity: data,
    loading,
    error,
  };
}


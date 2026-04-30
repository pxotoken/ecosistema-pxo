import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../lib/api';

interface PXOPrices {
  buy: number;
  sell: number;
  timestamp: number;
  loading: boolean;
  error: string | null;
}

export const usePXOPrices = (tokenSymbol: string = 'USDC') => {
  const [prices, setPrices] = useState<PXOPrices>({
    buy: 0,
    sell: 0,
    timestamp: 0,
    loading: true,
    error: null,
  });

  const fetchPrices = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setPrices(prev => ({ ...prev, loading: true, error: null }));
      }
      
      const pair = `PXO/${tokenSymbol}`;
      const { data } = await api.get(`/api/prices?pair=${pair}`);

      setPrices({
        buy: data.buy,
        sell: data.sell,
        timestamp: data.timestamp,
        loading: false,
        error: null,
      });
    } catch (err) {
      setPrices(prev => ({
        ...prev,
        loading: false,
        error: getApiError(err, 'Failed to fetch prices'),
      }));
      console.error('Error fetching PXO prices:', err);
    }
  }, [tokenSymbol]);

  useEffect(() => {
    fetchPrices(true);

    const interval = setInterval(() => fetchPrices(false), 5000);
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return {
    ...prices,
    refetch: fetchPrices,
  };
};


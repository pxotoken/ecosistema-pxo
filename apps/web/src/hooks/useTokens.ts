import { useState, useEffect } from 'react';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  icon_url?: string;
  contract_uuid?: string;
  network_id?: string;
  pxo_sell_price?: number;
  pxo_buy_price?: number;
  pxo_sell_commission?: number;
  type: string;
  created_at: string;
  updated_at: string;
}

export const useTokens = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/exchange/tokens');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tokens');
      }

      setTokens(data.tokens);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const getTokenBySymbol = (symbol: string): Token | undefined => {
    return tokens.find(token => token.symbol === symbol);
  };

  const getCryptoTokens = (): Token[] => {
    return tokens.filter(token => token.type === 'CRYPTO');
  };

  const getFiatTokens = (): Token[] => {
    return tokens.filter(token => token.type === 'FIAT');
  };

  const refreshTokens = () => {
    fetchTokens();
  };

  return {
    tokens,
    loading,
    error,
    getTokenBySymbol,
    getCryptoTokens,
    getFiatTokens,
    refreshTokens
  };
};

import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../lib/api';

export interface PricingRule {
  id: string;
  pair: string;
  spread_buy: number;
  spread_sell: number;
  updated_at: string;
}

interface UsePricingRulesResult {
  rules: PricingRule[];
  loading: boolean;
  error: string | null;
  fetchRules: () => Promise<void>;
  createRule: (rule: Omit<PricingRule, 'id' | 'updated_at'>) => Promise<PricingRule>;
  updateRule: (id: string, updates: Partial<Omit<PricingRule, 'id' | 'updated_at'>>) => Promise<PricingRule>;
  deleteRule: (id: string) => Promise<void>;
  testPrice: (pair: string, type: 'buy' | 'sell') => Promise<{ price: number; basePrice: number; spread: number }>;
  refetch: () => void;
}

export const usePricingRules = (): UsePricingRulesResult => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: result } = await api.get('/api/admin/pricing-rules');
      setRules(result.data || []);
    } catch (err) {
      setError(getApiError(err, 'Failed to fetch pricing rules'));
      console.error('Error fetching pricing rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (rule: Omit<PricingRule, 'id' | 'updated_at'>): Promise<PricingRule> => {
    try {
      const { data: result } = await api.post('/api/admin/pricing-rules', rule);
      setRules(prev => [...prev, result.data]);
      return result.data;
    } catch (err) {
      console.error('Error creating pricing rule:', err);
      throw new Error(getApiError(err, 'Failed to create pricing rule'));
    }
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<Omit<PricingRule, 'id' | 'updated_at'>>): Promise<PricingRule> => {
    try {
      const { data: result } = await api.put('/api/admin/pricing-rules', { id, ...updates });
      setRules(prev => prev.map(rule => rule.id === id ? result.data : rule));
      return result.data;
    } catch (err) {
      console.error('Error updating pricing rule:', err);
      throw new Error(getApiError(err, 'Failed to update pricing rule'));
    }
  }, []);

  const deleteRule = useCallback(async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/pricing-rules?id=${id}`);
      setRules(prev => prev.filter(rule => rule.id !== id));
    } catch (err) {
      console.error('Error deleting pricing rule:', err);
      throw new Error(getApiError(err, 'Failed to delete pricing rule'));
    }
  }, []);

  const testPrice = useCallback(async (pair: string, type: 'buy' | 'sell'): Promise<{ price: number; basePrice: number; spread: number }> => {
    try {
      const { data: result } = await api.get(`/api/prices?pair=${pair}`);
      const rule = rules.find(r => r.pair === pair);
      
      if (!rule) {
        throw new Error('Pricing rule not found for this pair');
      }

      const finalPrice = type === 'buy' ? result.buy : result.sell;
      const spread = type === 'buy' ? rule.spread_buy : rule.spread_sell;
      const basePrice = type === 'buy' 
        ? finalPrice / (1 + spread)
        : finalPrice / (1 - spread);

      return {
        price: finalPrice,
        basePrice,
        spread
      };
    } catch (err) {
      console.error('Error testing price:', err);
      throw new Error(getApiError(err, 'Failed to test price'));
    }
  }, [rules]);

  const refetch = useCallback(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    testPrice,
    refetch,
  };
};


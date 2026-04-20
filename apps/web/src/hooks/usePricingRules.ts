import { useState, useEffect, useCallback } from 'react';

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
      const response = await fetch('/api/admin/pricing-rules');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pricing rules');
      }

      const result = await response.json();
      setRules(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching pricing rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (rule: Omit<PricingRule, 'id' | 'updated_at'>): Promise<PricingRule> => {
    try {
      const response = await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pricing rule');
      }

      const result = await response.json();
      setRules(prev => [...prev, result.data]);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error creating pricing rule:', err);
      throw new Error(errorMessage);
    }
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<Omit<PricingRule, 'id' | 'updated_at'>>): Promise<PricingRule> => {
    try {
      const response = await fetch('/api/admin/pricing-rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update pricing rule');
      }

      const result = await response.json();
      setRules(prev =>
        prev.map(rule =>
          rule.id === id ? result.data : rule
        )
      );
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error updating pricing rule:', err);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteRule = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/pricing-rules?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete pricing rule');
      }

      setRules(prev => prev.filter(rule => rule.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error deleting pricing rule:', err);
      throw new Error(errorMessage);
    }
  }, []);

  const testPrice = useCallback(async (pair: string, type: 'buy' | 'sell'): Promise<{ price: number; basePrice: number; spread: number }> => {
    try {
      const response = await fetch(`/api/prices?pair=${pair}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test price');
      }

      const result = await response.json();
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
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error testing price:', err);
      throw new Error(errorMessage);
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


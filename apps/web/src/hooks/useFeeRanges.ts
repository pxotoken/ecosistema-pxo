import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../lib/api';

/** Alphanumeric only, 1-64 chars — matches the API and the table's CHECK. */
export const FEE_CONCEPT_RE = /^[A-Za-z0-9]{1,64}$/;

export interface FeeRange {
  id: string;
  concept: string;
  amount_from: number;
  amount_to: number;
  /** Whole percent as entered: 10 means 10%. */
  percent: number;
  created_at: string;
  updated_at: string;
}

export type FeeRangeInput = Omit<FeeRange, 'id' | 'created_at' | 'updated_at'>;

interface UseFeeRangesResult {
  ranges: FeeRange[];
  loading: boolean;
  error: string | null;
  createRange: (input: FeeRangeInput) => Promise<FeeRange>;
  updateRange: (id: string, updates: Partial<FeeRangeInput>) => Promise<FeeRange>;
  deleteRange: (id: string) => Promise<void>;
  refetch: () => void;
}

/**
 * Fee-by-range data entry. Nothing in the app applies these percentages to a
 * transaction — the table is a scratchpad for stakeholders to record scenarios
 * worth simulating. See migration 004.
 */
export const useFeeRanges = (): UseFeeRangesResult => {
  const [ranges, setRanges] = useState<FeeRange[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.get('/api/admin/fee-ranges');
      setRanges(result.data || []);
    } catch (err) {
      setError(getApiError(err, 'Failed to fetch fee ranges'));
      console.error('Error fetching fee ranges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRange = useCallback(
    async (input: FeeRangeInput): Promise<FeeRange> => {
      try {
        const { data: result } = await api.post('/api/admin/fee-ranges', input);
        await fetchRanges();
        return result.data;
      } catch (err) {
        const message = getApiError(err, 'Failed to create fee range');
        setError(message);
        throw new Error(message);
      }
    },
    [fetchRanges],
  );

  const updateRange = useCallback(
    async (id: string, updates: Partial<FeeRangeInput>): Promise<FeeRange> => {
      try {
        const { data: result } = await api.put('/api/admin/fee-ranges', { id, ...updates });
        await fetchRanges();
        return result.data;
      } catch (err) {
        const message = getApiError(err, 'Failed to update fee range');
        setError(message);
        throw new Error(message);
      }
    },
    [fetchRanges],
  );

  const deleteRange = useCallback(
    async (id: string): Promise<void> => {
      try {
        await api.delete(`/api/admin/fee-ranges?id=${encodeURIComponent(id)}`);
        await fetchRanges();
      } catch (err) {
        const message = getApiError(err, 'Failed to delete fee range');
        setError(message);
        throw new Error(message);
      }
    },
    [fetchRanges],
  );

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  return {
    ranges,
    loading,
    error,
    createRange,
    updateRange,
    deleteRange,
    refetch: fetchRanges,
  };
};

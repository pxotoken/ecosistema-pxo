import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../lib/api';

export interface MaturityTerm {
  id: string;
  label: string;
  term_days: number;
  baseline_annual_yield_percent: number;
}

export interface FixedTermCd {
  id: string;
  requested_pxo: string;
  principal_pxo: string | null;
  term_days: number;
  annual_yield_percent: number;
  status: 'AWAITING_PXO' | 'ACTIVE' | 'MATURED' | 'PAID' | 'FAILED' | 'CANCELLED';
  chain_id: number;
  lock_tx_hash: string | null;
  deposit_date: string | null;
  maturity_date: string | null;
  failure_reason: string | null;
  created_at: string;
}

/**
 * The maturity terms behind the dropdown.
 *
 * Rates come from the `maturity_terms` table and are seeded at 0% — there is
 * no admin screen for them yet, so until the CFO runs an UPDATE the dropdown
 * honestly shows 0.00% per year rather than a number nobody approved.
 */
export function useMaturityTerms() {
  const [terms, setTerms] = useState<MaturityTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTerms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: MaturityTerm[] }>('/api/exchange/cd/terms');
      setTerms(data.data ?? []);
    } catch (err) {
      setError(getApiError(err, 'Could not load the available terms'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  return { terms, loading, error, refetch: fetchTerms };
}

/** The signed-in user's certificates, newest first. */
export function useFixedTermCds() {
  const [cds, setCds] = useState<FixedTermCd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: FixedTermCd[] }>('/api/exchange/cd/locks');
      setCds(data.data ?? []);
    } catch (err) {
      setError(getApiError(err, 'Could not load your certificates'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCds();
  }, [fetchCds]);

  return { cds, loading, error, refetch: fetchCds };
}

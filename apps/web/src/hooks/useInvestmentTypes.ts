import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../lib/api';

export interface InvestmentType {
  id: string;
  name: string;
  display_name: string;
  apy_percent: number;
}

/**
 * The investments catalogue — one entry per card on the Investments screen.
 *
 * `apy_percent` is the headline rate shown on the card. The rate a certificate
 * actually locks in is the one attached to the maturity term chosen on the
 * product screen; the two are not reconciled yet (migration 006).
 */
export function useInvestmentTypes() {
  const [types, setTypes] = useState<InvestmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: InvestmentType[] }>(
        '/api/exchange/investments/types',
      );
      setTypes(data.data ?? []);
    } catch (err) {
      setError(getApiError(err, 'Could not load the available investments'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { types, loading, error, refetch: fetchTypes };
}

/** One product, resolved from the slug in the URL. */
export function useInvestmentType(name: string | undefined) {
  const [type, setType] = useState<InvestmentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setType(null);
      setLoading(false);
      setError('No investment selected');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<{ data: InvestmentType }>(`/api/exchange/investments/types/${name}`)
      .then(({ data }) => {
        if (cancelled) return;
        setType(data.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err, 'Could not load this investment'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { type, loading, error };
}

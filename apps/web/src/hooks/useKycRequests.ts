import { useState, useEffect } from 'react';
import { ROUTES } from '../config/routes';
import api from '../lib/api';
import type { KycSubmission, KycSubmissionStatus } from '@pxo/shared/types';

export function useKycRequests(
  status: KycSubmissionStatus,
  revalidationKey?: number,
) {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get<{ submissions: KycSubmission[] }>(
          `${ROUTES.API.KYC}/submissions?status=${status}`,
        );
        setSubmissions(data.submissions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error fetching KYC submissions'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [status, revalidationKey]);

  return { submissions, isLoading, error };
}

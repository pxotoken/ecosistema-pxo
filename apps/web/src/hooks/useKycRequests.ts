import { useState, useEffect } from 'react';
import { KycRequest } from '@pxo/shared/types';

export function useKycRequests(status: KycRequest['status'], revalidationKey?: number) {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        console.log('🔄 Fetching KYC requests for status:', status);
        setIsLoading(true);
        
        const response = await fetch(`/api/kyc/requests?status=${status}`, {
          method: 'GET',
          credentials: 'include',
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Error fetching KYC requests');
        }

        const data = await response.json();
        console.log('📋 Received data:', data);
        setRequests(data);
      } catch (err) {
        console.error('❌ Hook error:', err);
        setError(err instanceof Error ? err : new Error('Error fetching KYC requests'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [status, revalidationKey]);

  return { requests, isLoading, error };
}

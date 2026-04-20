import { useState, useCallback } from 'react';
import type { SendContactEmailRequest, SendContactEmailResponse } from '@pxo/shared/types/email';

const API_BASE_URL = '/api/email/contact';

export const useContactEmail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendContactEmail = useCallback(async (data: SendContactEmailRequest): Promise<SendContactEmailResponse> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      setSuccess(true);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    sendContactEmail,
    clearStatus,
  };
};

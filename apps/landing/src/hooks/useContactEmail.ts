import { useState, useCallback } from 'react';
import type { SendContactEmailRequest, SendContactEmailResponse } from '@pxo/shared/types/email';
import api, { getApiError } from '../lib/api';

export const useContactEmail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendContactEmail = useCallback(async (data: SendContactEmailRequest): Promise<SendContactEmailResponse> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.post<SendContactEmailResponse>('/api/email/contact', data);
      setSuccess(true);
      return response.data;
    } catch (err) {
      const message = getApiError(err, 'Failed to send message');
      setError(message);
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

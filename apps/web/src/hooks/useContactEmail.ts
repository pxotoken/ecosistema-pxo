import { useState, useCallback } from 'react';
import type { SendContactEmailRequest, SendContactEmailResponse } from '@pxo/shared/types';
import api, { getApiError } from '../lib/api';

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
      const { data: result } = await api.post<SendContactEmailResponse>(API_BASE_URL, data);
      setSuccess(true);
      return result;
    } catch (err) {
      const errorMessage = getApiError(err, 'Failed to send message');
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

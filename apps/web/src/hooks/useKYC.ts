import { useState } from 'react';
import { User } from '@pxo/shared/types';

const API_BASE_URL = '/api/users/kyc';

// Helper to extract error message
const getErrorMessage = (err: unknown): string => {
  return err instanceof Error ? err.message : 'Unknown error';
};

export const useKYC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper wrapper for API requests with consistent error handling
  const withErrorHandling = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getKYCData = async (userId: string) => {
    return withErrorHandling(async () => {
      const response = await fetch(`${API_BASE_URL}?user_id=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch KYC data');
      }

      const result = await response.json();
      return result.data;
    });
  };

  const uploadFile = async (file: File, folder: string = 'kyc-documents'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload file');
    }

    const result = await response.json();
    return result.url;
  };

  const submitKYCData = async (
    userId: string,
    kycData: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      country?: string;
      legal_identification_type?: "dni" | "passport";
      frontDocument?: File;
      backDocument?: File;
      passport?: File;
      existingPassport?: string;
      existingFrontPhoto?: string;
      existingBackPhoto?: string;
    }
  ) => {
    return withErrorHandling(async () => {
      // Upload files based on document type
      const [frontPhotoUrl, backPhotoUrl, passportUrl] = await Promise.all([
        kycData.frontDocument ? uploadFile(kycData.frontDocument, 'identification-photos') : Promise.resolve(undefined),
        kycData.backDocument ? uploadFile(kycData.backDocument, 'identification-photos') : Promise.resolve(undefined),
        kycData.passport ? uploadFile(kycData.passport, 'passport') : Promise.resolve(undefined),
      ]);

      // Submit KYC data with file URLs
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          first_name: kycData.first_name,
          last_name: kycData.last_name,
          email: kycData.email,
          phone: kycData.phone,
          country: kycData.country,
          legal_identification_type: kycData.legal_identification_type,
          frontPhotoUrl,
          backPhotoUrl,
          passport: passportUrl,
          existingPassport: kycData.existingPassport,
          existingFrontPhoto: kycData.existingFrontPhoto,
          existingBackPhoto: kycData.existingBackPhoto,
          KYC_status: 'VALIDATING'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit KYC data');
      }

      const result = await response.json();
      return result.data;
    });
  };

  const updateKYCStatus = async (
    userId: string,
    status: "PENDING" | "VALIDATING" | "VALIDATED" | "BLOCKED"
  ) => {
    return withErrorHandling(async () => {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          KYC_status: status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update KYC status');
      }

      const result = await response.json();
      return result.data;
    });
  };

  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    getKYCData,
    submitKYCData,
    updateKYCStatus,
    uploadFile,
    clearError,
  };
};



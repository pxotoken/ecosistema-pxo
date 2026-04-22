import { useState } from 'react';
import { ROUTES } from '../config/routes';
import type {
  KycDocument,
  KycPersonalInfo,
  KycSubmission,
  ReviewKycPayload,
  SubmitKycPayload,
} from '@pxo/shared/types';

const API_BASE = ROUTES.API.KYC; // /api/kyc

// ISO-2 countries usados en el form. Centralizado acá para que el form quede limpio.
const COUNTRY_LABEL_TO_ISO2: Record<string, string> = {
  Mexico: 'MX',
  'United States': 'US',
  Canada: 'CA',
  Spain: 'ES',
  Argentina: 'AR',
  Chile: 'CL',
  Colombia: 'CO',
  Peru: 'PE',
  Brazil: 'BR',
};

export function normalizeCountryToIso2(value: string | undefined | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  return COUNTRY_LABEL_TO_ISO2[trimmed] ?? '';
}

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

interface SubmitKycInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string; // puede venir como label o ISO-2
  dateOfBirth: string; // ISO date YYYY-MM-DD
  documentType: 'dni' | 'passport';
  documentNumber: string;
  frontDocument?: File;
  backDocument?: File;
  passport?: File;
  existingPassportPath?: string;
  existingFrontPath?: string;
  existingBackPath?: string;
}

export const useKYC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withErrorHandling = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sube un archivo y devuelve el supabase storage path (NO la URL pública).
   * El microservicio api-kyc espera paths para luego construir URLs firmadas.
   */
  const uploadFile = async (
    file: File,
    folder = 'identification-photos',
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload file');
    }
    const result: { path?: string; url?: string } = await response.json();
    if (!result.path) throw new Error('Upload response missing storage path');
    return result.path;
  };

  /**
   * GET /api/kyc/status — devuelve el último submission del caller (resuelto por JWT).
   */
  const getKycStatus = async (): Promise<{
    submission: KycSubmission | null;
    status: KycSubmission['status'] | 'not_started';
  }> => {
    return withErrorHandling(async () => {
      const response = await fetch(`${API_BASE}/status`, { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch KYC status');
      }
      return response.json();
    });
  };

  /**
   * POST /api/kyc/submit — crea una nueva submission de KYC.
   * El caller se deriva del JWT (no se envía user_id).
   */
  const submitKyc = async (input: SubmitKycInput): Promise<KycSubmission> => {
    return withErrorHandling(async () => {
      // 1) Subir archivos nuevos en paralelo y juntar con existentes
      const [frontPath, backPath, passportPath] = await Promise.all([
        input.frontDocument ? uploadFile(input.frontDocument, 'identification-photos') : Promise.resolve(undefined),
        input.backDocument ? uploadFile(input.backDocument, 'identification-photos') : Promise.resolve(undefined),
        input.passport ? uploadFile(input.passport, 'passport') : Promise.resolve(undefined),
      ]);

      // 2) Armar el array de documents según el tipo
      const documents: KycDocument[] = [];
      if (input.documentType === 'passport') {
        const path = passportPath ?? input.existingPassportPath;
        if (!path) throw new Error('Passport document is required');
        documents.push({ type: 'id_front', path });
      } else {
        const front = frontPath ?? input.existingFrontPath;
        const back = backPath ?? input.existingBackPath;
        if (!front) throw new Error('Front ID document is required');
        if (!back) throw new Error('Back ID document is required');
        documents.push({ type: 'id_front', path: front });
        documents.push({ type: 'id_back', path: back });
      }

      // 3) Armar personalInfo según el contract del microservicio
      const country = normalizeCountryToIso2(input.country);
      if (!country) throw new Error(`Unsupported country: ${input.country}`);

      const personalInfo: KycPersonalInfo = {
        fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
        dateOfBirth: input.dateOfBirth,
        country,
        documentType: input.documentType, // 'dni' | 'passport' son válidos en el enum del microservicio
        documentNumber: input.documentNumber.trim(),
        // D1.3 — auditoría: guardamos email/phone en personal_info además de en users
        email: input.email,
        phone: input.phone,
      };

      const payload: SubmitKycPayload = { documents, personalInfo };

      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit KYC');
      }
      const result: { submission: KycSubmission } = await response.json();
      return result.submission;
    });
  };

  /**
   * POST /api/kyc/submissions/:id/review — admin only.
   * El microservicio sólo soporta approve/reject.
   */
  const reviewSubmission = async (
    submissionId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string,
  ): Promise<KycSubmission> => {
    return withErrorHandling(async () => {
      const payload: ReviewKycPayload = {
        action,
        ...(action === 'reject' ? { rejectionReason } : {}),
      };
      const response = await fetch(`${API_BASE}/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to review submission');
      }
      const result: { submission: KycSubmission } = await response.json();
      return result.submission;
    });
  };

  const clearError = () => setError(null);

  return {
    loading,
    error,
    getKycStatus,
    submitKyc,
    reviewSubmission,
    uploadFile,
    clearError,
  };
};

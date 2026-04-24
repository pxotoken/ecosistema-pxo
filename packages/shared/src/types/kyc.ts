// ============================================================================
// Tipos del microservicio api-kyc (fuente de verdad — ADR 0002)
// ============================================================================

export type KycSubmissionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type KycDocumentType =
  | 'id_front'
  | 'id_back'
  | 'selfie'
  | 'proof_of_address';

export type KycDocumentKind = 'passport' | 'ine' | 'dni' | 'other';

export interface KycDocument {
  type: KycDocumentType;
  path: string; // Supabase storage path (no URL pública)
}

export interface KycPersonalInfo {
  fullName: string;
  dateOfBirth: string; // ISO date (YYYY-MM-DD)
  country: string; // ISO-2, mayúsculas (MX, AR, US, ...)
  documentType: KycDocumentKind;
  documentNumber: string;
  // D1.3 — extensiones para auditoría (no requeridos por el schema Joi)
  email?: string;
  phone?: string;
}

export interface KycSubmission {
  id: string;
  user_id: string;
  status: KycSubmissionStatus;
  documents: KycDocument[];
  personal_info: KycPersonalInfo | null;
  rejection_reason: string | null;
  provider: string | null;
  provider_ref: string | null;
  provider_status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitKycPayload {
  documents: KycDocument[];
  personalInfo: KycPersonalInfo;
}

export interface ReviewKycPayload {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

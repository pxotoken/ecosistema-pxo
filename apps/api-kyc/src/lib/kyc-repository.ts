import type { SupabaseClient } from '@supabase/supabase-js';

export type KycSubmissionStatus = 'pending_review' | 'approved' | 'rejected' | 'cancelled';

export interface KycDocument {
  type: 'id_front' | 'id_back' | 'selfie' | 'proof_of_address';
  path: string; // supabase storage path
}

export interface KycPersonalInfo {
  fullName: string;
  dateOfBirth: string; // ISO date
  country: string;
  documentType: 'passport' | 'ine' | 'dni' | 'other';
  documentNumber: string;
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

export interface CreateSubmissionInput {
  user_id: string;
  documents: KycDocument[];
  personal_info: KycPersonalInfo;
}

export class KycRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: CreateSubmissionInput): Promise<KycSubmission> {
    const { data, error } = await this.supabase
      .from('kyc_submissions')
      .insert([
        {
          user_id: input.user_id,
          documents: input.documents,
          personal_info: input.personal_info,
          status: 'pending_review' as KycSubmissionStatus,
        },
      ])
      .select('*')
      .single();
    if (error) throw new Error(`Failed to create kyc submission: ${error.message}`);
    return data as KycSubmission;
  }

  async getLatestByUserId(userId: string): Promise<KycSubmission | null> {
    const { data, error } = await this.supabase
      .from('kyc_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch latest submission: ${error.message}`);
    return (data as KycSubmission) ?? null;
  }

  async getById(id: string): Promise<KycSubmission | null> {
    const { data, error } = await this.supabase
      .from('kyc_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch submission: ${error.message}`);
    return (data as KycSubmission) ?? null;
  }

  async listByStatus(status: KycSubmissionStatus, limit = 50): Promise<KycSubmission[]> {
    const { data, error } = await this.supabase
      .from('kyc_submissions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw new Error(`Failed to list submissions: ${error.message}`);
    return (data ?? []) as KycSubmission[];
  }

  async review(
    id: string,
    reviewerUserId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string,
  ): Promise<KycSubmission> {
    const { data, error } = await this.supabase
      .from('kyc_submissions')
      .update({
        status: decision,
        rejection_reason: decision === 'rejected' ? rejectionReason ?? null : null,
        reviewed_by: reviewerUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to review submission: ${error.message}`);
    return data as KycSubmission;
  }
}

export class UserKycStatusRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getIdByWalletAddress(walletAddress: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (error) throw new Error(`Failed to resolve user by wallet: ${error.message}`);
    return (data?.id as string) ?? null;
  }

  async setStatus(userId: string, status: 'VALIDATING' | 'VALIDATED' | 'REJECTED'): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ KYC_status: status, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw new Error(`Failed to update user KYC_status: ${error.message}`);
  }
}

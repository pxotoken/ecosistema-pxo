export enum KYCStatus {
  PENDING = "PENDING",
  VALIDATING = "VALIDATING",
  VALIDATED = "VALIDATED",
  BLOCKED = "BLOCKED",
  REJECTED = "REJECTED"
}

export interface User {
  id?: string; // UUID generado automáticamente
  provider_id: string;
  first_name?: string;
  last_name?: string;
  mail: string; // Único
  profile_picture?: string; 
  country?: string;
  wallet_address?: string;
  last_access?: Date;
  legal_identification?: string; 
  user_type?: string; 
  imagen_KYC?: string; 
  selfie_pictures?: string[]; 
  identification_photos?: string[]
  KYC_status?: KYCStatus;
  bank_name?: string;
  account_number?: string;
  CLABE?: string;
  verificated?: boolean;
  passport?: string;
  phone?: string;
  pin_hash?: string;
  auth_provider?: string | null;
  auth_provider_class?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateUserRequest {
  mail: string;
  provider_id: string;
  wallet_address: string;
  KYC_status?: KYCStatus;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  country?: string;
}

export interface UpdateUserRequest {
  id: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  country?: string;
  legal_identification?: string;
  user_type?: string;
  imagen_KYC?: string;
  selfie_pictures?: string[];
  identification_photos?: string[];
  KYC_status?: KYCStatus;
  bank_name?: string;
  account_number?: string;
  CLABE?: string;
  verificated?: boolean;
  passport?: string;
  phone?: string;
  pin_hash?: string;
}

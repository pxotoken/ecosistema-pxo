export interface KycRequest {
  id?: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country?: string;
  legal_identification_type: "dni" | "passport";
  identification_photos?: string[];
  passport?: string;
  status: "PENDING" | "VALIDATING" | "VALIDATED" | "REJECTED";
  created_at?: Date;
  updated_at?: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  rejection_reason?: string;
}

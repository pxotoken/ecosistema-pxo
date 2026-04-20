export interface ContactFormData {
  email: string;
  message: string;
}

export interface SendContactEmailRequest {
  email: string;
  message: string;
}

export interface SendContactEmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
}

export interface BroadcastEmailRequest {
  subject: string;
  message: string;
  emails?: string[];
}

export interface BroadcastEmailResult {
  success: boolean;
  totalUsers: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export interface BroadcastEmailResponse {
  success: true;
  message: string;
  data: {
    totalUsers: number;
    sent: number;
    failed: number;
    errors?: Array<{ email: string; error: string }>;
  };
}

/**
 * API Log Types
 * Type definitions for API logging system
 */

export interface ApiLog {
  id?: string;
  provider: string;
  method: string;
  endpoint: string;
  status: number;
  response: any;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApiLogData {
  provider: string;
  method: string;
  endpoint: string;
  status: number;
  response: any;
}

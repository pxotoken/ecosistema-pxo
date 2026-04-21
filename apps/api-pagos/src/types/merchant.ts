export type KYBStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED';

export interface Merchant {
  id: string;
  name: string;
  walletAddress: string;
  kybStatus: KYBStatus;
  callbackUrl?: string;
  apiKeyHash: string;
  isActive: boolean;
  createdAt: Date;
}

export interface POSDevice {
  id: string;
  merchantId: string;
  label: string;
  isActive: boolean;
  lastSeenAt?: Date;
}

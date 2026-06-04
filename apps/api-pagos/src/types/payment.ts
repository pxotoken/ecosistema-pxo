export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'FAILED';
export type PaymentDirection = 'PUSH' | 'PULL';

export interface Payment {
  id: string;
  merchantId: string;
  posId: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  amountMXN: number;
  amountPXO: string;
  merchantWallet: string;
  clientWallet?: string;
  txHash?: string;
  reference?: string;
  expiresAt: Date;
  createdAt: Date;
  confirmedAt?: Date;
  chainId: number;
}

export interface GeneratePaymentRequest {
  amount: number;
  merchantId: string;
  currency: 'PXO';
  posId: string;
  reference?: string;
}

export interface GeneratePaymentResponse {
  paymentId: string;
  qrData: string;
  qrRaw: string;
  walletAddress: string;
  amountPXO: string;
  amountMXN: number;
  expiresAt: string;
  chainId: number;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  direction: PaymentDirection;
  txHash?: string;
  confirmedAt?: string;
  amountMXN: number;
  amountPXO: string;
  merchantWallet: string;
  clientWallet?: string;
  reference?: string;
  chainId: number;
  expiresAt: string;
}

export interface CreateChargeIntentRequest {
  clientWalletAddress: string;
  amount: number;
  merchantId: string;
  posId: string;
  reference?: string;
}

export interface CreateChargeIntentResponse {
  chargeId: string;
  amountPXO: string;
  amountMXN: number;
  expiresAt: string;
  chainId: number;
  merchantWallet: string;
  clientWallet: string;
}

export interface PendingChargeResponse {
  chargeId: string;
  merchantId: string;
  merchantName?: string;
  merchantWallet: string;
  amountMXN: number;
  amountPXO: string;
  reference?: string;
  expiresAt: string;
  chainId: number;
}

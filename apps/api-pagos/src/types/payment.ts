export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'FAILED';

export interface Payment {
  id: string;
  merchantId: string;
  posId: string;
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
  chainId: 56;
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
  chainId: 56;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  txHash?: string;
  confirmedAt?: string;
  amountMXN: number;
  amountPXO: string;
}

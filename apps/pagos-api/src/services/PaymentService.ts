import type { Payment, GeneratePaymentRequest, GeneratePaymentResponse, PaymentStatusResponse } from '../types/payment.js';

export class PaymentService {
  // TODO: Inject Supabase client

  async generate(_request: GeneratePaymentRequest): Promise<GeneratePaymentResponse> {
    // TODO: Implement payment generation flow
    throw new Error('Not implemented');
  }

  async getStatus(_paymentId: string): Promise<PaymentStatusResponse> {
    // TODO: Implement payment status lookup + TTL check
    throw new Error('Not implemented');
  }

  async confirm(_paymentId: string, _txHash: string, _clientWallet: string): Promise<Payment> {
    // TODO: Update payment to CONFIRMED state
    throw new Error('Not implemented');
  }

  async expirePending(): Promise<number> {
    // TODO: Batch-expire payments past TTL
    throw new Error('Not implemented');
  }
}

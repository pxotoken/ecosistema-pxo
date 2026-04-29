import type { SupabaseClient } from '@supabase/supabase-js';
import type { Payment, PaymentStatus } from '../types/payment.js';

interface PaymentRow {
  id: string;
  merchant_id: string;
  pos_id: string;
  status: PaymentStatus;
  amount_mxn: number | string;
  amount_pxo: string;
  merchant_wallet: string;
  client_wallet: string | null;
  tx_hash: string | null;
  reference: string | null;
  chain_id: number;
  expires_at: string;
  created_at: string;
  confirmed_at: string | null;
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    posId: row.pos_id,
    status: row.status,
    amountMXN: typeof row.amount_mxn === 'string' ? Number(row.amount_mxn) : row.amount_mxn,
    amountPXO: row.amount_pxo,
    merchantWallet: row.merchant_wallet,
    clientWallet: row.client_wallet ?? undefined,
    txHash: row.tx_hash ?? undefined,
    reference: row.reference ?? undefined,
    chainId: row.chain_id,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
  };
}

export interface CreatePaymentInput {
  id: string;
  merchantId: string;
  posId: string;
  amountMXN: number;
  amountPXO: string;
  merchantWallet: string;
  reference?: string;
  chainId: number;
  expiresAt: Date;
}

export class PaymentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: CreatePaymentInput): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .insert({
        id: input.id,
        merchant_id: input.merchantId,
        pos_id: input.posId,
        status: 'PENDING',
        amount_mxn: input.amountMXN,
        amount_pxo: input.amountPXO,
        merchant_wallet: input.merchantWallet,
        reference: input.reference ?? null,
        chain_id: input.chainId,
        expires_at: input.expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create payment: ${error.message}`);
    return rowToPayment(data as PaymentRow);
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch payment: ${error.message}`);
    
    return data ? rowToPayment(data as PaymentRow) : null;
  }

  async findPendingByWalletAndAmount(
    merchantWallet: string,
    amountPXO: string,
    chainId: number,
  ): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('merchant_wallet', merchantWallet)
      .eq('amount_pxo', amountPXO)
      .eq('chain_id', chainId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to search payment by wallet+amount: ${error.message}`);
    return data ? rowToPayment(data as PaymentRow) : null;
  }

  async markConfirmed(
    paymentId: string,
    txHash: string,
    clientWallet: string,
  ): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .update({
        status: 'CONFIRMED',
        tx_hash: txHash,
        client_wallet: clientWallet,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('status', 'PENDING')
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to confirm payment: ${error.message}`);
    return data ? rowToPayment(data as PaymentRow) : null;
  }

  async markFailed(paymentId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .update({ status: 'FAILED' })
      .eq('id', paymentId)
      .in('status', ['PENDING'])
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to mark payment failed: ${error.message}`);
    return data ? rowToPayment(data as PaymentRow) : null;
  }

  /**
   * Batch-expire all PENDING payments past their TTL. Returns the count expired.
   */
  async expirePending(): Promise<number> {
    const { data, error } = await this.supabase
      .from('payments')
      .update({ status: 'EXPIRED' })
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw new Error(`Failed to expire payments: ${error.message}`);
    return data?.length ?? 0;
  }

  async listPendingWithTxHash(): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('status', 'PENDING')
      .not('tx_hash', 'is', null);

    if (error) throw new Error(`Failed to list reconcilable payments: ${error.message}`);
    return ((data ?? []) as PaymentRow[]).map(rowToPayment);
  }
}

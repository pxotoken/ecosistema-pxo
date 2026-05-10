import {
  API_BASE_URL,
  POS_API_KEY,
  POS_MERCHANT_ID,
  POS_POS_ID,
} from '../config/env';

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
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'FAILED';
  txHash?: string;
  confirmedAt?: string;
  amountMXN: number;
  amountPXO: string;
  merchantWallet: string;
  reference?: string;
  chainId: number;
  expiresAt: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  const err = (body ?? {}) as { error?: string; code?: string; details?: unknown };
  return new ApiError(res.status, err.code, err.error || res.statusText);
}

/**
 * Fetch helper that automatically attaches the user's JWT (Bearer) + includes
 * cookies, for endpoints that require authenticated client identity
 * (orchestrator's `/api/users/*`, `/api/kyc/*`, `/api/wallet/*`, etc.).
 * Use `generatePayment` below for POS-authenticated calls.
 */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const jwt = (() => {
    try {
      return localStorage.getItem('pxo_jwt');
    } catch {
      return null;
    }
  })();

  const headers = new Headers(init.headers);
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
}

export async function generatePayment(params: {
  amount: number;
  reference?: string;
}): Promise<GeneratePaymentResponse> {
  if (!POS_API_KEY || !POS_MERCHANT_ID || !POS_POS_ID) {
    throw new ApiError(
      400,
      'POS_NOT_CONFIGURED',
      'POS credentials missing in .env (VITE_POS_API_KEY / VITE_POS_MERCHANT_ID / VITE_POS_POS_ID).',
    );
  }

  const res = await fetch(`${API_BASE_URL}/v1/payments/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${POS_API_KEY}`,
      'X-POS-ID': POS_POS_ID,
    },
    body: JSON.stringify({
      amount: params.amount,
      merchantId: POS_MERCHANT_ID,
      currency: 'PXO',
      posId: POS_POS_ID,
      reference: params.reference,
    }),
  });

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as GeneratePaymentResponse;
}

export async function getPaymentStatus(
  paymentId: string,
): Promise<PaymentStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/payments/${paymentId}/status`);
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as PaymentStatusResponse;
}

export async function reportPaymentTx(
  paymentId: string,
  txHash: string,
  clientWallet: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/v1/payments/${paymentId}/tx`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txHash, clientWallet }),
  });
  if (!res.ok) {
    const err = await parseError(res);
    if (err.status !== 409) throw err;
  }
}

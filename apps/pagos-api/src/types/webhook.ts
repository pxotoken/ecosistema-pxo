export interface PolygonTransferWebhook {
  txHash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  blockTimestamp: number;
  contractAddress: string;
}

export interface POSConfirmationWebhook {
  paymentId: string;
  status: 'CONFIRMED' | 'FAILED';
  txHash: string;
  confirmedAt: string;
  amountMXN: number;
  amountPXO: string;
  reference?: string;
}

export interface WalletTransactionDTO {
  hash: string;
  from_address: string;
  to_address: string;
  block_timestamp: string | null;
  value: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number | string;
  isReceived: boolean;
  status: number;
}

export interface WalletTransactionsResponse {
  data: WalletTransactionDTO[];
  meta: { total_items: number };
}

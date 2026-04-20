export type TransactionType = 'SEND' | 'RECEIVE' | 'BUY' | 'SELL';

export const TransactionTypes = {
  SEND: 'SEND',
  RECEIVE: 'RECEIVE',
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export interface HistoryItem {
  id: string;
  type: TransactionType;
  amount: number;
  tokenSymbol: string;
  tokenName?: string;
  fromAddress: string;
  toAddress: string;
  timestamp: Date;
  txHash?: string;
  pxoTxHash?: string;
  baseAmount?: number;
  currencyPair?: string;
  status?: string;
  tokenType?:string;
  tokenAddress?:string;
  tokenDecimals?:number;
  price?:number | null;
  fee?:number | null;
  chain_id?: number;
  contractAddress?:string;
  isReceived?:boolean;
  tokenIcon?:string;
} 
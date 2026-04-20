/**
 * Binance API Types
 * Type definitions for Binance API responses
 */

export interface BinancePriceResponse {
  symbol: string;
  price: string;
}

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface BinanceAccountBalance {
  asset: string;
  free: string;
  locked: string;
}

/**
 * Binance Account Response
 */
export interface BinanceAccountResponse {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceAccountBalance[];
  permissions: string[];
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER = 'LIMIT_MAKER',
}

export enum TimeInForce {
  GTC = 'GTC',
  IOC = 'IOC',
  FOK = 'FOK',
}


export interface CreateOrderRequest {
  symbol: string;           // e.g., "BTCUSDT"
  side: OrderSide;          // BUY or SELL
  type: OrderType;          // LIMIT, MARKET, etc.
  quantity: string;         // Amount to buy/sell
  price?: string;           // Required for LIMIT orders
  timeInForce?: TimeInForce; // GTC, IOC, FOK (required for LIMIT)
  newClientOrderId?: string; // Unique order ID
}

export interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  fills: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

export interface GetAllOrdersRequest {
  symbol: string;           // Trading pair (required)
  orderId?: number;         // Return orders >= this orderId
  startTime?: number;       // Timestamp in ms
  endTime?: number;         // Timestamp in ms
  limit?: number;           // Default 500, max 1000
}

export interface BinanceOrderHistoryResponse {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;           // NEW, PARTIALLY_FILLED, FILLED, CANCELED, REJECTED, EXPIRED
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;             // Order creation time
  updateTime: number;       // Last update time
  isWorking: boolean;
  origQuoteOrderQty: string;
}

export interface BinanceErrorResponse {
  code: number;
  msg: string;
}

export interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: BinanceErrorResponse;
  };
  message?: string;
}

/**
 * Binance Endpoint Monitoring Types
 */
export enum EndpointStatus {
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
}

export interface BinanceEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  status: EndpointStatus;
  last_tested: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateEndpointStatus {
  name: string;
  url: string;
  method: string;
  status: EndpointStatus;
  last_tested?: string;
}


/**
 * Binance API Integration Service
 * Handles all interactions with Binance API
 */

import apiClient, { API_PROVIDERS } from '../../config/axios/index.js';
import { HTTP_STATUS } from '@pxo/shared/consts/http';
import type {
  BinancePriceResponse,
  BinanceAccountResponse,
  BinanceOrderResponse,
  CreateOrderRequest,
  PriceData,
  GetAllOrdersRequest,
  BinanceOrderHistoryResponse,
} from '@pxo/shared/types';

const BINANCE_API_BASE_URL = process.env.BINANCE_API_BASE_URL;

/**
 * Test connectivity with Binance API.
 * @returns true if connection is successful (status 200)
 */
export async function testPing(): Promise<boolean> {
  const response = await apiClient.get(
    `${BINANCE_API_BASE_URL}/ping`,
    { provider: API_PROVIDERS.BINANCE }
  );
  return response.status === HTTP_STATUS.OK;
}

/**
 * Get current price for a trading pair
 * @param symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @returns Price data
 */
export async function getCurrentPrice(symbol: string): Promise<PriceData> {
  const response = await apiClient.get<BinancePriceResponse>(
    `${BINANCE_API_BASE_URL}/ticker/price`,
    {
      params: { symbol },
      provider: API_PROVIDERS.BINANCE,
    }
  );

  return {
    symbol: response.data.symbol,
    price: parseFloat(response.data.price),
    timestamp: Date.now(),
  };
}

/**
 * Get account balance (REQUIRES AUTHENTICATION)
 * @param filterZeroBalances - If true, only returns assets with balance > 0
 * @returns Account information including balances
 */
export async function getAccountBalance(filterZeroBalances = true): Promise<BinanceAccountResponse> {
  const response = await apiClient.get<BinanceAccountResponse>(
    `${BINANCE_API_BASE_URL}/account`,
    {
      provider: API_PROVIDERS.BINANCE,
      binanceAuth: true,
    }
  );

  const accountData = response.data;

  if (filterZeroBalances) {
    accountData.balances = accountData.balances.filter(
      (balance) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
    );
  }

  return accountData;
}

/**
 * Create a new order (REQUIRES AUTHENTICATION)
 * @param orderData - Order parameters
 * @returns Order response with fill information
 */
export async function createOrder(orderData: CreateOrderRequest): Promise<BinanceOrderResponse> {
  const response = await apiClient.post<BinanceOrderResponse>(
    `${BINANCE_API_BASE_URL}/order`,
    undefined,
    {
      params: orderData,
      provider: API_PROVIDERS.BINANCE,
      binanceAuth: true,
    }
  );
  return response.data;
}

/**
 * Get all orders for a symbol (REQUIRES AUTHENTICATION)
 * Returns all orders (active, completed, canceled, etc.)
 * @param params - Query parameters (symbol required, limit optional)
 * @returns Array of orders
 */
export async function getAllOrders(
  params: GetAllOrdersRequest
): Promise<BinanceOrderHistoryResponse[]> {
  const response = await apiClient.get<BinanceOrderHistoryResponse[]>(
    `${BINANCE_API_BASE_URL}/allOrders`,
    {
      params,
      provider: API_PROVIDERS.BINANCE,
      binanceAuth: true,
    }
  );
  return response.data;
}


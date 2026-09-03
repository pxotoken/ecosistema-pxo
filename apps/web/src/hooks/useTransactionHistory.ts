import { useState, useEffect } from 'react';
import { HistoryItem, TransactionType } from '@pxo/shared/types';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import api, { getApiError } from '../lib/api';

interface TransactionHistoryFilters {
  type?: TransactionType[];
  startDate?: Date;
  endDate?: Date;
}

export function useTransactionHistory(initialFilters?: TransactionHistoryFilters) {
  const [filters, setFilters] = useState<TransactionHistoryFilters>(initialFilters || {});
  const [orders, setOrders] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();

  const fetchOrders = async () => {
    if (!account?.address) return;

    try {
      setIsLoading(true);
      const chainId = activeChain?.id ?? 137;
      const { data } = await api.get(`/api/exchange/orders?userAddress=${account.address}&chainId=${chainId}`);
      
      if (data.success && data.orders) {
        // Transform orders to HistoryItem format
        const transformedOrders = data.orders.map((order: any) => ({
          id: order.id,
          type: order.type as TransactionType,
          amount: order.amount,
          tokenSymbol: order.tokenSymbol,
          tokenName: order.tokenName,
          status: order.status,
          timestamp: new Date(order.timestamp),
          txHash: order.txHash,
          pxoTxHash: order.pxoTxHash,
          price: order.price,
          baseAmount: order.baseAmount,
          currencyPair: order.currencyPair,
          fromAddress: order.fromAddress,
          toAddress: order.toAddress,
          chain_id: order.chain_id,
          completedAt: order.completedAt,
          inputTransaction: order.inputTransaction,
          outputTransaction: order.outputTransaction
        }));

        setOrders(transformedOrders);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(new Error(getApiError(err, 'Error fetching orders')));
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [account?.address, activeChain?.id]);

  // Apply filters
  const filteredOrders = orders.filter(order => {
    if (filters.type?.length && !filters.type.includes(order.type)) return false;
    if (filters.startDate && order.timestamp < filters.startDate) return false;
    if (filters.endDate && order.timestamp > filters.endDate) return false;
    return true;
  });

  const updateFilters = (newFilters: Partial<TransactionHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const refreshOrders = () => {
    fetchOrders();
  };

  return {
    transactions: filteredOrders,
    isLoading,
    error,
    filters,
    updateFilters,
    refreshOrders
  };
}
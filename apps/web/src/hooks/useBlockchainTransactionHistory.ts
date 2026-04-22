import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { formatUnits } from 'viem';
import { HistoryItem, TransactionType } from '@pxo/shared/types';

interface BlockchainTransactionFilters {
  type?: TransactionType[];
  startDate?: Date;
  endDate?: Date;
  chain?: number[];
}

interface Transaction {
  chain_id: number;
  block_number: string;
  block_hash: string;
  block_timestamp: string;
  hash: string;
  from_address: string;
  to_address: string;
  value: number;
  gas_price: number;
  gas: number;
  gas_used: number;
  effective_gas_price: number;
  status: number;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  contractAddress: string;
  isReceived: boolean;
}

interface TransactionResponse {
  data: Transaction[];
  meta: {
    chain_ids: number[];
    address: string;
    page: number;
    limit_per_chain: number;
    total_items: number;
    total_pages: number;
    tokenSymbol: string;
    tokenAddress: string;
  };
}

export function useBlockchainTransactionHistory(initialFilters?: BlockchainTransactionFilters) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [transactions, setTransactions] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<BlockchainTransactionFilters>(initialFilters || {});

  const fetchTransactions = async () => {
    if (!account?.address) return [];

    const queryParams = new URLSearchParams({
      address: account.address,
      sort_by: 'block_timestamp',
      sort_order: 'desc',
      limit: '50',
    });

    if (filters.startDate) {
      queryParams.append('filter_block_timestamp_gte', 
        Math.floor(filters.startDate.getTime() / 1000).toString()
      );
    }
    if (filters.endDate) {
      queryParams.append('filter_block_timestamp_lte', 
        Math.floor(filters.endDate.getTime() / 1000).toString()
      );
    }

    const chainId = activeChain?.id || filters.chain?.[0] || 137;
    
    try {
      const response = await fetch(`/api/wallet/transactions?chain=${chainId}&${queryParams.toString()}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  const transformToHistoryItem = (tx: any): HistoryItem => {
    return {
      id: tx.hash,
      timestamp: new Date(tx.block_timestamp),
      type: tx.isReceived ? 'RECEIVE' : 'SEND',
      amount: Number(tx.value),
      tokenSymbol: tx.tokenSymbol,
      tokenName: tx.tokenSymbol,
      tokenType: 'ERC20',
      tokenAddress: tx.tokenAddress,
      //tokenDecimals: tx.tokenDecimals,
      price: null,
      fee: Number(formatUnits(BigInt(tx.gas_used * tx.effective_gas_price || '0'), 18)),
      txHash: tx.hash,
      status: tx.status === 1 ? 'COMPLETED' : 'FAILED',
      fromAddress: tx.from_address,
      toAddress: tx.to_address,
      chain_id: tx.chain_id,
     // contractAddress: tx.contractAddress,
     // isReceived: tx.isReceived,
    };
  };

  const fetchAndTransformTransactions = async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const txs = await fetchTransactions();
      if (!txs) return;
      const transformedTransactions = txs.map(transformToHistoryItem);
      
      const filteredTransactions = transformedTransactions.filter((tx: HistoryItem) => {
        if (filters.type && filters.type.length > 0 && !filters.type.includes(tx.type)) {
          return false;
        }
        if (filters.startDate && tx.timestamp < filters.startDate) return false;
        if (filters.endDate && tx.timestamp > filters.endDate) return false;
        return true;
      });

      setTransactions(filteredTransactions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching transactions'));
      console.error('Error fetching blockchain transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<BlockchainTransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  useEffect(() => {
    fetchAndTransformTransactions();
  }, [account?.address, activeChain?.id, JSON.stringify(filters)]);

  return {
    transactions,
    isLoading,
    error,
    filters,
    updateFilters,
    refetch: fetchAndTransformTransactions,
  };
} 
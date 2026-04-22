import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getAssetTransfers, type AssetTransfer } from '../lib/alchemy.js';
import { toSupportedChainId } from '../config/chains.js';
import { requireCaller } from '../middleware/identity.js';
import type { WalletTransactionDTO, WalletTransactionsResponse } from '../types/transaction.js';

interface TransactionsQuery {
  address?: string;
  chain?: string;
}

function toTransactionDTO(tx: AssetTransfer, address: string): WalletTransactionDTO {
  const to = tx.to ?? '';
  return {
    hash: tx.hash,
    from_address: tx.from,
    to_address: to,
    block_timestamp: tx.metadata?.blockTimestamp
      ? new Date(tx.metadata.blockTimestamp).toISOString()
      : null,
    value: tx.value?.toString() ?? '0',
    tokenSymbol: tx.asset,
    tokenAddress: tx.rawContract.address,
    tokenDecimals: tx.rawContract.decimal ?? 18,
    isReceived: to.toLowerCase() === address.toLowerCase(),
    status: 1,
  };
}

export const transactionsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireCaller);

  app.get<{ Querystring: TransactionsQuery }>('/transactions', async (req, reply) => {
    const { address, chain } = req.query;
    if (!address) {
      return reply.code(400).send({ error: 'address is required' });
    }

    const chainId = toSupportedChainId(chain);

    try {
      const transfers = await getAssetTransfers(address, chainId);
      const transactions = transfers.map((tx) => toTransactionDTO(tx, address));
      const response: WalletTransactionsResponse = {
        data: transactions,
        meta: { total_items: transactions.length },
      };
      return reply.send(response);
    } catch (error) {
      req.log.error({ err: error }, 'transactions fetch failed');
      return reply.code(500).send({
        error: 'Failed to fetch transactions',
        details: (error as Error).message,
      });
    }
  });
};

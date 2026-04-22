import { env } from '../config/env.js';
import { ALCHEMY_HOST_BY_CHAIN, type SupportedChainId } from '../config/chains.js';

export interface AssetTransfer {
  hash: string;
  from: string;
  to: string;
  value: number | string | null;
  asset: string;
  rawContract: { address: string; decimal?: string | number };
  metadata?: { blockTimestamp?: string };
}

interface AssetTransfersResult {
  transfers?: AssetTransfer[];
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

type TransferDirection = 'sent' | 'received';

function buildParams(address: string, direction: TransferDirection) {
  return {
    fromBlock: '0x0',
    toBlock: 'latest',
    [direction === 'sent' ? 'fromAddress' : 'toAddress']: address,
    category: ['erc20'],
    order: 'desc',
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: '0x3e8',
  };
}

async function callAlchemy(url: string, direction: TransferDirection, address: string): Promise<AssetTransfer[]> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [buildParams(address, direction)],
    }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy request failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as JsonRpcResponse<AssetTransfersResult>;
  if (body.error) throw new Error(`Alchemy error: ${body.error.message}`);
  return body.result?.transfers ?? [];
}

export async function getAssetTransfers(
  address: string,
  chainId: SupportedChainId,
): Promise<AssetTransfer[]> {
  if (!env.ALCHEMY_API_KEY) throw new Error('Missing ALCHEMY_API_KEY');
  const url = `https://${ALCHEMY_HOST_BY_CHAIN[chainId]}/v2/${env.ALCHEMY_API_KEY}`;

  const [sent, received] = await Promise.all([
    callAlchemy(url, 'sent', address),
    callAlchemy(url, 'received', address),
  ]);

  return [...sent, ...received];
}

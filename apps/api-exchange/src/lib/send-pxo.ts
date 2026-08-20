import { getContract, prepareContractCall, sendTransaction, getGasPrice } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt } from 'thirdweb/rpc';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { env } from '../config/env.js';
import {
  PXO_TOKEN_ADDRESSES,
  TOKEN_TRANSFER_GAS_LIMIT,
  type SupportedChainId,
} from '../config/chains.js';
import { getServerThirdwebClient } from './thirdweb-client.js';
import { getDecryptedWalletKey } from './wallet-key.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

export interface SendPXOParams {
  quantity: bigint;
  receiverAddress: string;
  chainId: number;
}

export interface SendResult {
  success: true;
  transactionHash: string;
  blockNumber: bigint | null;
  message: string;
}

export async function sendPXOToUser({
  quantity,
  receiverAddress,
  chainId,
}: SendPXOParams): Promise<SendResult> {
  const selectedChain =
    CHAIN_MAP[chainId as SupportedChainId] ?? (env.FORCE_POLYGON_MAINNET ? polygon : polygonAmoy);
  const pxoTokenAddress = PXO_TOKEN_ADDRESSES[selectedChain.id as SupportedChainId];

  if (!pxoTokenAddress) {
    throw new Error(`PXO token address not configured for chain ${selectedChain.id}`);
  }

  const SERVER_PRIVATE_KEY = await getDecryptedWalletKey();
  if (!SERVER_PRIVATE_KEY) {
    throw new Error('Server wallet private key not configured');
  }

  const client = getServerThirdwebClient();
  if (!client) {
    throw new Error(
      'Server Thirdweb client not available. Check THIRDWEB_SECRET_KEY environment variable.',
    );
  }

  const serverWallet = privateKeyToAccount({ privateKey: SERVER_PRIVATE_KEY, client });

  const contract = getContract({
    address: pxoTokenAddress,
    client,
    chain: selectedChain,
  });

  let gasPrice: bigint;
  try {
    gasPrice = await getGasPrice({ client, chain: selectedChain });
    if (selectedChain.id === 80002 && gasPrice < BigInt(25_000_000_000)) {
      gasPrice = BigInt(30_000_000_000);
    }
  } catch {
    gasPrice = selectedChain.id === 80002 ? BigInt(30_000_000_000) : BigInt(20_000_000_000);
  }

  const transaction = prepareContractCall({
    contract,
    method: 'function transfer(address to, uint256 value)',
    params: [receiverAddress, quantity],
    gas: TOKEN_TRANSFER_GAS_LIMIT,
    gasPrice,
  });

  const sent = await sendTransaction({ transaction, account: serverWallet });

  const rpcRequest = getRpcClient({ client, chain: selectedChain });
  const receipt = await pollReceipt(rpcRequest, sent.transactionHash);

  return {
    success: true,
    transactionHash: sent.transactionHash,
    blockNumber: receipt?.blockNumber ?? null,
    message: 'PXO tokens sent successfully',
  };
}

async function pollReceipt(
  rpcRequest: ReturnType<typeof getRpcClient>,
  hash: string,
): Promise<{ blockNumber: bigint } | null> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const receipt = await eth_getTransactionReceipt(rpcRequest, {
        hash: hash as `0x${string}`,
      });
      if (receipt && receipt.status === 'success') {
        return { blockNumber: receipt.blockNumber };
      }
    } catch {
      // swallow and retry
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return null;
}

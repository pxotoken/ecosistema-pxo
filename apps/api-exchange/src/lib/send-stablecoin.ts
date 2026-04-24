import { getContract, prepareContractCall, sendTransaction, getGasPrice } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt } from 'thirdweb/rpc';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import {
  USDC_TOKEN_ADDRESSES,
  USDT_TOKEN_ADDRESSES,
  STABLE_DECIMALS,
  type SupportedChainId,
} from '../config/chains.js';
import { getServerThirdwebClient } from './thirdweb-client.js';
import { getDecryptedWalletKey } from './wallet-key.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

export interface SendStablecoinParams {
  amountHuman: number;
  tokenSymbol: 'USDC' | 'USDT';
  receiverAddress: string;
  chainId: number;
}

export interface SendStablecoinResult {
  success: true;
  transactionHash: string | null;
  blockNumber: bigint | null;
  message: string;
}

export async function sendStablecoinToUser({
  amountHuman,
  tokenSymbol,
  receiverAddress,
  chainId,
}: SendStablecoinParams): Promise<SendStablecoinResult> {
  const selectedChain = CHAIN_MAP[chainId as SupportedChainId] ?? polygon;
  const tokenAddress =
    tokenSymbol === 'USDT'
      ? USDT_TOKEN_ADDRESSES[selectedChain.id as SupportedChainId]
      : USDC_TOKEN_ADDRESSES[selectedChain.id as SupportedChainId];

  if (!tokenAddress) {
    throw new Error(`Stablecoin ${tokenSymbol} not configured for chain ${selectedChain.id}`);
  }

  const SERVER_PRIVATE_KEY = await getDecryptedWalletKey();
  if (!SERVER_PRIVATE_KEY) throw new Error('Server wallet private key not configured');

  const client = getServerThirdwebClient();
  if (!client) throw new Error('Server Thirdweb client not available.');

  const serverWallet = privateKeyToAccount({ privateKey: SERVER_PRIVATE_KEY, client });
  const rawAmount = BigInt(Math.floor(amountHuman * 10 ** STABLE_DECIMALS));

  const contract = getContract({ address: tokenAddress, client, chain: selectedChain });

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
    params: [receiverAddress, rawAmount],
    gas: BigInt(100_000),
    gasPrice,
  });

  let sent;
  try {
    sent = await sendTransaction({ transaction, account: serverWallet });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes('already known')) {
      return {
        success: true,
        transactionHash: null,
        blockNumber: null,
        message: `${tokenSymbol} transaction already known by node`,
      };
    }
    throw error;
  }

  const rpcRequest = getRpcClient({ client, chain: selectedChain });
  const deadline = Date.now() + 25_000;
  let blockNumber: bigint | null = null;
  while (Date.now() < deadline) {
    try {
      const receipt = await eth_getTransactionReceipt(rpcRequest, {
        hash: sent.transactionHash as `0x${string}`,
      });
      if (receipt && receipt.status === 'success') {
        blockNumber = receipt.blockNumber;
        break;
      }
    } catch {
      // swallow and retry
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }

  return {
    success: true,
    transactionHash: sent.transactionHash,
    blockNumber,
    message: `${tokenSymbol} sent successfully`,
  };
}

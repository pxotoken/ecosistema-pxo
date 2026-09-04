import { getContract, prepareContractCall, sendTransaction, getGasPrice, readContract } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt } from 'thirdweb/rpc';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { env } from '../config/env.js';
import {
  PXO_TOKEN_ADDRESSES,
  TOKEN_TRANSFER_GAS_LIMIT,
  PXO_MINT_GAS_LIMIT,
  PXO_DECIMALS,
  type SupportedChainId,
} from '../config/chains.js';
import {
  resolveIssuanceMode,
  decideIssuance,
  hasMinterRole,
  type IssuanceAction,
} from './pxo-issuance.js';
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
  /**
   * Whether the PXO was moved from the operational wallet or created.
   * Worth persisting alongside the order: minted PXO increases total supply,
   * which is a reserve-accounting fact, not just an implementation detail.
   */
  action: IssuanceAction;
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

  // Decide whether to move existing balance or create supply. Only the reads
  // the decision actually needs are made: transfer mode reads nothing extra,
  // and auto checks the minter role only when the balance falls short.
  const mode = resolveIssuanceMode();
  const decimals = PXO_DECIMALS[selectedChain.id as SupportedChainId] ?? 6;

  let balance = 0n;
  if (mode !== 'mint') {
    balance = await readContract({
      contract,
      method: 'function balanceOf(address account) view returns (uint256)',
      params: [serverWallet.address],
    });
  }

  let minterRole = false;
  if (mode === 'mint' || (mode === 'auto' && balance < quantity)) {
    minterRole = await hasMinterRole({
      client,
      chain: selectedChain,
      tokenAddress: pxoTokenAddress,
      account: serverWallet.address,
    });
  }

  const action = decideIssuance({ mode, balance, quantity, minterRole, decimals });

  const transaction =
    action === 'mint'
      ? prepareContractCall({
          contract,
          method: 'function mint(address to, uint256 amount)',
          params: [receiverAddress, quantity],
          gas: PXO_MINT_GAS_LIMIT,
          gasPrice,
        })
      : prepareContractCall({
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
    message: action === 'mint' ? 'PXO minted to the buyer' : 'PXO tokens sent successfully',
    action,
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

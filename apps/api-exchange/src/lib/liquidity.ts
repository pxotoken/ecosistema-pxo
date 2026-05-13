import { getContract } from 'thirdweb/contract';
import { getBalance } from 'thirdweb/extensions/erc20';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { env } from '../config/env.js';
import {
  PXO_TOKEN_ADDRESSES,
  USDC_TOKEN_ADDRESSES,
  PXO_DECIMALS,
  STABLE_DECIMALS,
  type SupportedChainId,
} from '../config/chains.js';
import { getServerThirdwebClient } from './thirdweb-client.js';
import { getDecryptedWalletKey } from './wallet-key.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

export interface LiquidityResponse {
  chainId: number;
  chainName: string;
  pxo: {
    address: string | undefined;
    balance: number;
    decimals: number;
    symbol: 'PXO';
  };
  stable: {
    address: string | undefined;
    balance: number;
    decimals: number;
    symbol: 'USDC';
  };
}

export async function getServerLiquidity(chainIdInput?: number): Promise<LiquidityResponse> {
  const targetChainId: SupportedChainId =
    chainIdInput && (chainIdInput === 137 || chainIdInput === 80002)
      ? chainIdInput
      : env.FORCE_POLYGON_MAINNET
        ? 137
        : 80002;

  const chain = CHAIN_MAP[targetChainId] ?? polygon;

  const client = getServerThirdwebClient();
  if (!client) {
    throw new Error('Server Thirdweb client not available.');
  }

  const privateKey = await getDecryptedWalletKey();
  if (!privateKey) {
    throw new Error('Server wallet private key not configured');
  }

  const serverWallet = privateKeyToAccount({
    privateKey,
    client,
  });

  const address = serverWallet.address;
  const pxoAddress = PXO_TOKEN_ADDRESSES[chain.id as SupportedChainId];
  const stableAddress = USDC_TOKEN_ADDRESSES[chain.id as SupportedChainId];

  let pxoBalanceHuman = 0;
  let stableBalanceHuman = 0;

  if (pxoAddress) {
    try {
      const pxoContract = getContract({ address: pxoAddress, client, chain });
      const pxoBalance = await getBalance({ contract: pxoContract, address });
      pxoBalanceHuman = Number(pxoBalance.displayValue || 0);
    } catch (error) {
      console.error('Error fetching PXO liquidity balance:', error);
    }
  }

  if (stableAddress) {
    try {
      const stableContract = getContract({ address: stableAddress, client, chain });
      const stableBalance = await getBalance({ contract: stableContract, address });
      stableBalanceHuman = Number(stableBalance.displayValue || 0);
    } catch (error) {
      console.error('Error fetching stablecoin liquidity balance:', error);
    }
  }

  return {
    chainId: chain.id,
    chainName: chain.name ?? `Chain ${chain.id}`,
    pxo: {
      address: pxoAddress,
      balance: pxoBalanceHuman,
      decimals: PXO_DECIMALS[chain.id as SupportedChainId] ?? 18,
      symbol: 'PXO',
    },
    stable: {
      address: stableAddress,
      balance: stableBalanceHuman,
      decimals: STABLE_DECIMALS,
      symbol: 'USDC',
    },
  };
}

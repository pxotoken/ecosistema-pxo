import { getContract } from 'thirdweb/contract';
import { getBalance } from 'thirdweb/extensions/erc20';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerThirdwebClient } from './client.js';
import { getDecryptedWalletKey } from './crypto/keyManager.js';

const FORCE_POLYGON_MAINNET = process.env.FORCE_POLYGON_MAINNET === 'true';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy };

const PXO_TOKEN_ADDRESSES = {
  137: process.env.PXO_TOKEN_ADDRESS_MAINNET,
  80002: process.env.PXO_TOKEN_ADDRESS_TESTNET,
};

const STABLECOIN_ADDRESSES = {
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  80002: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  },
};

const PXO_DECIMALS = { 137: 6, 80002: 18 };
const STABLE_DECIMALS = 6;

export async function getServerLiquidity(chainIdInput) {
  const targetChainId =
    chainIdInput && CHAIN_MAP[chainIdInput]
      ? chainIdInput
      : FORCE_POLYGON_MAINNET
      ? 137
      : 80002;

  const chain = CHAIN_MAP[targetChainId] || polygon;

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
    chain,
  });

  const address = serverWallet.address;

  const pxoAddress = PXO_TOKEN_ADDRESSES[chain.id];
  const stableAddress = STABLECOIN_ADDRESSES[chain.id]?.USDC;

  let pxoBalanceHuman = 0;
  let stableBalanceHuman = 0;

  if (pxoAddress) {
    try {
      const pxoContract = getContract({
        address: pxoAddress,
        client,
        chain,
      });
      const pxoBalance = await getBalance({
        contract: pxoContract,
        address,
      });
      pxoBalanceHuman = Number(pxoBalance.displayValue || 0);
    } catch (error) {
      console.error('Error fetching PXO liquidity balance:', error);
    }
  }

  if (stableAddress) {
    try {
      const stableContract = getContract({
        address: stableAddress,
        client,
        chain,
      });
      const stableBalance = await getBalance({
        contract: stableContract,
        address,
      });
      stableBalanceHuman = Number(stableBalance.displayValue || 0);
    } catch (error) {
      console.error('Error fetching stablecoin liquidity balance:', error);
    }
  }

  return {
    chainId: chain.id,
    chainName: chain.name,
    pxo: {
      address: pxoAddress,
      balance: pxoBalanceHuman,
      decimals: PXO_DECIMALS[chain.id] ?? 18,
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


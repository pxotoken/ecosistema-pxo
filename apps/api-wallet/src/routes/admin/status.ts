import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { privateKeyToAccount, getWalletBalance } from 'thirdweb/wallets';
import { getBalance } from 'thirdweb/extensions/erc20';
import { getContract, type ThirdwebClient } from 'thirdweb';
import { polygonAmoy, polygon } from 'thirdweb/chains';
import { env } from '../../config/env.js';
import { PXO_TOKEN_ADDRESSES, USDC_TOKEN_ADDRESSES, type SupportedChainId } from '../../config/chains.js';
import { getServerThirdwebClient } from '../../lib/thirdweb-client.js';
import { getDecryptedWalletKey } from '../../lib/wallet-key.js';
import { requireAdmin } from '../../middleware/admin.js';

interface KeyStatus {
  configured: boolean;
  encrypted: boolean;
  canSign: boolean;
  address: string | null;
  error: string | null;
}

interface ChainBalanceEntry {
  value: string;
  displayValue: string;
  symbol: string;
  decimals: number;
}

interface ChainBalances {
  chainName: string;
  native: ChainBalanceEntry | null;
  pxo: ChainBalanceEntry | null;
  usdc: ChainBalanceEntry | null;
}

function testKeyCanSign(
  privateKey: string,
  client: ThirdwebClient,
): { canSign: boolean; address: string | null; error: string | null } {
  try {
    const account = privateKeyToAccount({ privateKey, client });
    const address = account.address;
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return { canSign: false, address: null, error: 'Invalid wallet address generated' };
    }
    return { canSign: true, address, error: null };
  } catch (error) {
    return { canSign: false, address: null, error: (error as Error).message };
  }
}

async function readChainBalances(
  address: string,
  client: ThirdwebClient,
  chain: typeof polygon | typeof polygonAmoy,
  log: FastifyInstance['log'],
): Promise<ChainBalances> {
  const chainData: ChainBalances = {
    chainName: chain.name || `Chain ${chain.id}`,
    native: null,
    pxo: null,
    usdc: null,
  };

  try {
    const native = await getWalletBalance({ address, client, chain });
    chainData.native = {
      value: native.value.toString(),
      displayValue: native.displayValue,
      symbol: native.symbol,
      decimals: native.decimals,
    };
  } catch (error) {
    log.error({ err: error, chainId: chain.id }, 'native balance fetch failed');
  }

  const tokens: Array<{ key: 'pxo' | 'usdc'; address: string | undefined }> = [
    { key: 'pxo', address: PXO_TOKEN_ADDRESSES[chain.id as SupportedChainId] },
    { key: 'usdc', address: USDC_TOKEN_ADDRESSES[chain.id as SupportedChainId] },
  ];

  for (const { key, address: tokenAddress } of tokens) {
    if (!tokenAddress) continue;
    try {
      const contract = getContract({ address: tokenAddress, client, chain });
      const balance = await getBalance({ contract, address });
      chainData[key] = {
        value: balance.value.toString(),
        displayValue: balance.displayValue,
        symbol: balance.symbol,
        decimals: balance.decimals,
      };
    } catch (error) {
      log.error({ err: error, chainId: chain.id, token: key }, 'token balance fetch failed');
    }
  }

  return chainData;
}

export const adminStatusRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAdmin);

  app.get('/status', async (req, reply) => {
    const client = getServerThirdwebClient();
    if (!client) {
      return reply.code(500).send({ error: 'Thirdweb client not available' });
    }

    const primaryChain = env.FORCE_POLYGON_MAINNET ? polygon : polygonAmoy;
    const chainsToCheck = [polygon, polygonAmoy];

    const keyStatus: KeyStatus = {
      configured: false,
      encrypted: false,
      canSign: false,
      address: null,
      error: null,
    };

    try {
      const privateKey = await getDecryptedWalletKey();
      keyStatus.configured = true;
      keyStatus.encrypted = !!env.WALLET_PRIVATE_KEY_ENCRYPTED;

      const signTest = testKeyCanSign(privateKey, client);
      keyStatus.canSign = signTest.canSign;
      keyStatus.address = signTest.address;
      keyStatus.error = signTest.error;
    } catch (error) {
      keyStatus.error = (error as Error).message;
    }

    const balances: Record<number, ChainBalances> = {};
    if (keyStatus.address) {
      for (const chain of chainsToCheck) {
        balances[chain.id] = await readChainBalances(keyStatus.address, client, chain, req.log);
      }
    }

    return reply.send({
      wallet: {
        address: keyStatus.address,
        primaryChain: { id: primaryChain.id, name: primaryChain.name },
      },
      keyStatus: {
        configured: keyStatus.configured,
        encrypted: keyStatus.encrypted,
        canSign: keyStatus.canSign,
        error: keyStatus.error,
      },
      balances,
    });
  });
};

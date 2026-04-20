import { getDecryptedWalletKey } from '../../lib/crypto/keyManager.js';
import { getServerThirdwebClient } from '../../lib/client.js';
import { privateKeyToAccount, getWalletBalance } from 'thirdweb/wallets';
import { getBalance } from 'thirdweb/extensions/erc20';
import { getContract } from 'thirdweb';
import { polygonAmoy, polygon } from 'thirdweb/chains';
import { withAdminAuth } from '../../lib/authMiddleware.js';

const FORCE_POLYGON_MAINNET = process.env.FORCE_POLYGON_MAINNET === 'true';

const PXO_TOKEN_ADDRESSES = {
  137: process.env.PXO_TOKEN_ADDRESS_MAINNET,
  80002: process.env.PXO_TOKEN_ADDRESS_TESTNET,
};

const USDC_TOKEN_ADDRESSES = {
  137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  80002: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
};

async function testKeyCanSign(privateKey, client, chain) {
  try {
    const account = privateKeyToAccount({
      privateKey,
      client,
      chain
    });
    
    const address = account.address;
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return { canSign: false, error: 'Invalid wallet address generated' };
    }
    
    return { canSign: true, address };
  } catch (error) {
    return { canSign: false, error: error.message };
  }
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = getServerThirdwebClient();
    if (!client) {
      return res.status(500).json({ error: 'Thirdweb client not available' });
    }

    const primaryChain = FORCE_POLYGON_MAINNET ? polygon : polygonAmoy;
    const chainsToCheck = [polygon, polygonAmoy];

    let privateKey;
    let keyStatus = {
      configured: false,
      encrypted: false,
      canSign: false,
      address: null,
      error: null
    };

    try {
      privateKey = await getDecryptedWalletKey();
      
      if (privateKey) {
        keyStatus.configured = true;
        keyStatus.encrypted = !!process.env.WALLET_PRIVATE_KEY_ENCRYPTED;
        
        const signTest = await testKeyCanSign(privateKey, client, primaryChain);
        keyStatus.canSign = signTest.canSign;
        keyStatus.address = signTest.address;
        keyStatus.error = signTest.error;
      } else {
        keyStatus.error = 'Private key not configured';
      }
    } catch (error) {
      keyStatus.error = error.message;
    }

    const chainBalances = {};

    if (keyStatus.address) {
      for (const chain of chainsToCheck) {
        const chainData = { native: null, pxo: null, usdc: null };

        try {
          const balanceResult = await getWalletBalance({
            address: keyStatus.address,
            client,
            chain
          });
          chainData.native = {
            value: balanceResult.value.toString(),
            displayValue: balanceResult.displayValue,
            symbol: balanceResult.symbol,
            decimals: balanceResult.decimals
          };
        } catch (error) {
          console.error(`Error fetching native balance on chain ${chain.id}:`, error);
        }

        const tokenFetches = [
          { key: 'pxo', address: PXO_TOKEN_ADDRESSES[chain.id] },
          { key: 'usdc', address: USDC_TOKEN_ADDRESSES[chain.id] },
        ];

        for (const { key, address } of tokenFetches) {
          if (!address) continue;
          try {
            const contract = getContract({ address, client, chain });
            const balanceResult = await getBalance({
              contract,
              address: keyStatus.address
            });
            chainData[key] = {
              value: balanceResult.value.toString(),
              displayValue: balanceResult.displayValue,
              symbol: balanceResult.symbol,
              decimals: balanceResult.decimals
            };
          } catch (error) {
            console.error(`Error fetching ${key} balance on chain ${chain.id}:`, error);
          }
        }

        chainBalances[chain.id] = {
          chainName: chain.name || `Chain ${chain.id}`,
          ...chainData
        };
      }
    }

    return res.status(200).json({
      wallet: {
        address: keyStatus.address,
        primaryChain: {
          id: primaryChain.id,
          name: primaryChain.name
        }
      },
      keyStatus: {
        configured: keyStatus.configured,
        encrypted: keyStatus.encrypted,
        canSign: keyStatus.canSign,
        error: keyStatus.error
      },
      balances: chainBalances
    });
  } catch (error) {
    console.error('Error in wallet status API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

export default withAdminAuth(handler);


import { getServerSupabase } from '../../lib/supabase.js';
import { getServerThirdwebClient } from '../../lib/client.js';
import { getContract } from 'thirdweb/contract';
import { prepareContractCall, prepareTransaction, sendTransaction } from 'thirdweb/transaction';
import { estimateGas, getGasPrice } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt } from 'thirdweb/rpc';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy, bsc } from 'thirdweb/chains';
import { getDecryptedWalletKey } from '../../lib/crypto/keyManager.js';

const supabase = getServerSupabase();
const MAX_SUBSIDIES_PER_DAY = parseInt(process.env.MAX_GAS_SUBSIDIES_PER_DAY || '100');
const MIN_INTERVAL_MS = parseInt(process.env.GAS_SUBSIDY_MIN_INTERVAL_MINUTES || '1') * 60 * 1000;
const MAX_DAILY_AMOUNT = process.env.MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI
  ? BigInt(process.env.MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI)
  : null;

// Token decimals
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;

const CHAIN_MAP = {
  137: polygon,
  80002: polygonAmoy,
  56: bsc,
};

const DEFAULT_TOKEN_TYPE = {
  137: process.env.POLYGON_DEFAULT_TOKEN || 'USDC',
  80002: process.env.POLYGON_AMOY_DEFAULT_TOKEN || 'USDC',
  56: process.env.BSC_DEFAULT_TOKEN || 'USDC',
};

const TOKEN_CONTRACTS = {
  137: {
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  },
  80002: {
    USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    USDT: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
  },
  56: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
  },
};

const PXO_RECEIVER_ADDRESSES = {
  137: process.env.POLYGON_PXO_RECEIVER_ADDRESS || "0x9f0f2eac50ad04d37d3bf3359735928126ac8382",
  80002: process.env.POLYGON_AMOY_PXO_RECEIVER_ADDRESS || "0x9f0f2eac50ad04d37d3bf3359735928126ac8382",
  56: process.env.BSC_PXO_RECEIVER_ADDRESS || "0x9f0f2eac50ad04d37d3bf3359735928126ac8382",
};

// const WHITELISTED_TOKENS = {
//   137: new Set([
//     "0xd6f9c21a585e2d77b62ec8c65ab9bec70e2b77d7", // PXO
//     "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
//     "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC
//   ]),
//   80002: new Set([
//     "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", // USDC Testnet
//     "0xeda62cd0d29e077b98e0b61d905c4af906d8946c", // PXO Testnet
//   ]),
// };

// Simple authentication function
async function getCurrentUser(req) {
  try {
    const cookies = req.headers.cookie;
    if (!cookies) {
      return null;
    }

    const userMatch = cookies.match(/pxo_user=([^;]+)/);
    if (userMatch) {
      try {
        const userData = JSON.parse(decodeURIComponent(userMatch[1]));
        return userData;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Gas Subsidy API called');
    
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      userAddress, paymentAmount, chainId, tokenType,
      source, tokenContractAddress: directTokenAddress, receiverAddress: directReceiverAddress, tokenDecimals: directDecimals,
    } = req.body;

    if (!userAddress || !chainId) {
      return res.status(400).json({ error: 'Missing required fields: userAddress, chainId' });
    }
    if (source !== 'transfer' && (paymentAmount == null || paymentAmount < 0)) {
      return res.status(400).json({ error: 'Missing required fields: paymentAmount (required for exchange)' });
    }

    const chain = CHAIN_MAP[chainId];
    if (!chain) {
      return res.status(400).json({ error: `Unsupported chain ID: ${chainId}` });
    }

    let resolvedTokenAddress;
    let resolvedReceiverAddress;
    let resolvedDecimals;
    let resolvedTokenLabel;

    if (source === 'transfer') {
      if (!directTokenAddress || !directReceiverAddress) {
        return res.status(400).json({ error: 'Missing required fields for transfer: tokenContractAddress, receiverAddress' });
      }
      // const whitelist = WHITELISTED_TOKENS[chainId];
      // if (!whitelist || !whitelist.has(directTokenAddress.toLowerCase())) {
      //   return res.status(400).json({ error: 'Token not whitelisted for gas subsidy' });
      // }
      resolvedTokenAddress = directTokenAddress;
      resolvedReceiverAddress = directReceiverAddress;
      resolvedDecimals = directDecimals || 18;
      resolvedTokenLabel = 'transfer';
    } else {
      const selectedTokenType = tokenType || DEFAULT_TOKEN_TYPE[chainId];
      if (!selectedTokenType) {
        return res.status(400).json({ error: `No default token configured for chain ID: ${chainId}` });
      }
      resolvedTokenAddress = TOKEN_CONTRACTS[chainId]?.[selectedTokenType];
      if (!resolvedTokenAddress) {
        return res.status(400).json({ error: `${selectedTokenType} contract not configured for chain ID: ${chainId}` });
      }
      resolvedReceiverAddress = PXO_RECEIVER_ADDRESSES[chainId];
      if (!resolvedReceiverAddress) {
        return res.status(400).json({ error: `PXO receiver address not configured for chain ID: ${chainId}` });
      }
      resolvedDecimals = selectedTokenType === 'USDT' ? USDT_DECIMALS : USDC_DECIMALS;
      resolvedTokenLabel = selectedTokenType;
    }

    console.log('📝 Gas subsidy request:', {
      source: source || 'exchange',
      userAddress,
      paymentAmount,
      chainId,
      tokenAddress: resolvedTokenAddress,
      receiverAddress: resolvedReceiverAddress,
      chainName: chain.name,
      userId: user.id,
    });

    const client = getServerThirdwebClient();

    if (!client) {
      return res.status(500).json({ error: 'Server client not available. Check THIRDWEB_SECRET_KEY environment variable.' });
    }

    const paymentAmountInDecimals = source === 'transfer'
      ? BigInt(1)
      : BigInt(Math.floor((paymentAmount ?? 0) * Math.pow(10, resolvedDecimals)));

    const contract = getContract({
      address: resolvedTokenAddress,
      client,
      chain: chain,
    });

    const amountForGasEstimate = source === 'transfer' ? BigInt(1) : paymentAmountInDecimals;

    const tx = prepareContractCall({
      contract,
      method: "function transfer(address to, uint256 value)",
      params: [resolvedReceiverAddress, amountForGasEstimate],
    });

    const estimatedGas = await estimateGas({
      transaction: tx,
      from: userAddress,
    });

    console.log('⛽ Estimated gas:', estimatedGas);

    // Get current gas price with fallback for testnet
    let gasPrice;
    try {
      gasPrice = await getGasPrice({
        client,
        chain: chain
      });
      console.log('💰 Gas price from network:', gasPrice);
      
      // Validate gas price - if it's too low for testnet, use fallback
      if (chainId === 80002 && gasPrice < BigInt(25000000000)) {
        console.log('⚠️ Gas price too low for testnet, using fallback');
        gasPrice = BigInt(30000000000); // 30 gwei fallback
      }
    } catch (error) {
      console.error('❌ Error getting gas price:', error);
      // Use fallback gas price
      gasPrice = chainId === 80002 ? BigInt(30000000000) : BigInt(20000000000);
      console.log('💰 Using fallback gas price:', gasPrice);
    }

    // Calculate subsidy amount (150% of estimated gas cost)
    const subsidyAmount = estimatedGas * gasPrice * BigInt(15) / BigInt(10);
    console.log('🎁 Subsidy amount:', subsidyAmount.toString());

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentSubsidies } = await supabase
      .from('gas_subsidies')
      .select('created_at, amount')
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (recentSubsidies?.length) {
      if (recentSubsidies.length >= MAX_SUBSIDIES_PER_DAY) {
        const oldestInWindow = new Date(recentSubsidies[recentSubsidies.length - 1].created_at).getTime();
        const resetMs = (oldestInWindow + 24 * 60 * 60 * 1000) - Date.now();
        const resetMinutes = Math.ceil(resetMs / 60000);
        console.log(`⏰ User hit daily subsidy limit (${MAX_SUBSIDIES_PER_DAY})`);
        return res.status(429).json({
          error: `Has alcanzado el límite de ${MAX_SUBSIDIES_PER_DAY} subsidios por día. Se reinicia en ~${resetMinutes} min.`,
          needsSubsidy: true,
          remaining: 0,
          resetInMinutes: resetMinutes,
        });
      }

      const lastTime = new Date(recentSubsidies[0].created_at).getTime();
      const elapsed = Date.now() - lastTime;
      if (elapsed < MIN_INTERVAL_MS) {
        const waitMs = MIN_INTERVAL_MS - elapsed;
        const waitSeconds = Math.ceil(waitMs / 1000);
        console.log(`⏰ User must wait ${waitSeconds}s between subsidies`);
        return res.status(429).json({
          error: `Espera ${waitSeconds} segundos antes de solicitar otro subsidio.`,
          needsSubsidy: true,
          remaining: MAX_SUBSIDIES_PER_DAY - recentSubsidies.length,
          waitSeconds,
        });
      }

      if (MAX_DAILY_AMOUNT) {
        const totalToday = recentSubsidies.reduce((sum, s) => sum + BigInt(s.amount || '0'), BigInt(0));
        if (totalToday + subsidyAmount > MAX_DAILY_AMOUNT) {
          console.log('⏰ User hit daily subsidy amount cap');
          return res.status(429).json({
            error: 'Has alcanzado el monto máximo de subsidio diario.',
            needsSubsidy: true,
            remaining: MAX_SUBSIDIES_PER_DAY - recentSubsidies.length,
          });
        }
      }
    }

    // Get server wallet private key (decrypted)
    let privateKey;
    try {
      privateKey = await getDecryptedWalletKey();
    } catch (error) {
      console.error('❌ Error decrypting wallet key:', error);
      return res.status(500).json({ 
        error: 'Server wallet not configured. Check WALLET_PRIVATE_KEY or WALLET_PRIVATE_KEY_ENCRYPTED environment variables.' 
      });
    }

    if (!privateKey) {
      return res.status(500).json({ error: 'Server wallet not configured. Check WALLET_PRIVATE_KEY environment variable.' });
    }

    // Create subsidy wallet
    const subsidyWallet = privateKeyToAccount({ 
      client, 
      privateKey 
    });

    console.log("Gas subsidyWallet", JSON.stringify({ subsidyWallet }));

    // Prepare subsidy transaction with dynamic gas price
    const transaction = prepareTransaction({
      to: userAddress,
      value: subsidyAmount,
      chain: chain,
      client,
      gas: estimatedGas,
      gasPrice: gasPrice, // Use the validated gas price
    });

    // Send subsidy transaction
    const { transactionHash } = await sendTransaction({
      transaction,
      account: subsidyWallet,
    });

    console.log('📤 Gas subsidy sent:', transactionHash);

    const rpcRequest = getRpcClient({ client, chain: chain });
    let transactionReceipt = null;

    const checkTransactionReceipt = () => {
      return new Promise((resolve) => {
        const intervalId = setInterval(async () => {
          try {
            const receipt = await eth_getTransactionReceipt(rpcRequest, { hash: transactionHash });
            if (receipt && receipt.status === 'success') {
              transactionReceipt = receipt;
              clearInterval(intervalId);
              resolve();
            }
          } catch (e) {
            console.log('Error checking transaction receipt:', e.message || e);
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(intervalId);
          resolve();
        }, 25000);
      });
    };

    try {
      await checkTransactionReceipt();
      if (transactionReceipt) {
        console.log('✅ Gas subsidy confirmed:', { hash: transactionHash, blockNumber: transactionReceipt.blockNumber });
      } else {
        console.log('⏳ Gas subsidy broadcast; receipt not yet available (tx hash:', transactionHash, ')');
      }
    } catch (receiptError) {
      console.error('❌ Gas subsidy receipt check error:', receiptError);
    }

    // Record subsidy in database
    const { error: insertError } = await supabase
      .from('gas_subsidies')
      .insert({
        user_id: user.id,
        address: userAddress,
        amount: subsidyAmount.toString(),
        tx_hash: transactionHash,
      });

    if (insertError) {
      console.error('❌ Error recording subsidy:', insertError);
      // Don't fail the request, just log the error
    }

    const result = {
      success: true,
      needsSubsidy: true,
      subsidyTxHash: transactionHash,
      estimatedGas: estimatedGas.toString(),
      subsidyAmount: subsidyAmount.toString(),
      source: source || 'exchange',
      chainId: chainId,
      message: `Subsidio de gas enviado exitosamente (${resolvedTokenLabel})`
    };

    console.log('✅ Gas subsidy completed:', result);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error in gas subsidy API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

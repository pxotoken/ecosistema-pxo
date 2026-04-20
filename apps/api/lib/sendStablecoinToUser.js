import { getContract, prepareContractCall, sendTransaction, getGasPrice } from 'thirdweb';
import { getRpcClient, eth_getTransactionReceipt } from 'thirdweb/rpc';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import { getServerThirdwebClient } from './client.js';
import { getDecryptedWalletKey } from './crypto/keyManager.js';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy };

const STABLECOIN_ADDRESSES = {
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  80002: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    USDT: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  },
};

const DECIMALS = 6;

export async function sendStablecoinToUser({
  amountHuman,
  tokenSymbol,
  receiverAddress,
  chainId,
}) {
  const selectedChain = CHAIN_MAP[chainId] || polygon;
  const tokenAddress = STABLECOIN_ADDRESSES[selectedChain.id]?.[tokenSymbol];

  if (!tokenAddress) {
    throw new Error(`Stablecoin ${tokenSymbol} not configured for chain ${selectedChain.id}`);
  }

  const SERVER_PRIVATE_KEY = await getDecryptedWalletKey();
  if (!SERVER_PRIVATE_KEY) {
    throw new Error('Server wallet private key not configured');
  }

  const client = getServerThirdwebClient();
  if (!client) {
    throw new Error('Server Thirdweb client not available.');
  }

  const serverWallet = privateKeyToAccount({
    privateKey: SERVER_PRIVATE_KEY,
    client,
    chain: selectedChain,
  });

  const rawAmount = BigInt(Math.floor(amountHuman * 10 ** DECIMALS));

  const contract = getContract({
    address: tokenAddress,
    client,
    chain: selectedChain,
  });

  console.log('📤 Sending stablecoin to user:', {
    receiverAddress,
    amountHuman,
    tokenSymbol,
    tokenAddress,
    chainId: selectedChain.id,
  });

  let gasPrice;
  try {
    gasPrice = await getGasPrice({ client, chain: selectedChain });
    if (selectedChain.id === 80002 && gasPrice < BigInt(25000000000)) {
      gasPrice = BigInt(30000000000);
    }
  } catch (error) {
    gasPrice = selectedChain.id === 80002 ? BigInt(30000000000) : BigInt(20000000000);
  }

  const transaction = prepareContractCall({
    contract,
    method: 'function transfer(address to, uint256 value)',
    params: [receiverAddress, rawAmount],
    gas: BigInt(100000),
    gasPrice,
  });

  let sentTransactionResult;
  try {
    sentTransactionResult = await sendTransaction({
      transaction,
      account: serverWallet,
    });
    console.log('📤 Stablecoin transaction sent:', sentTransactionResult.transactionHash);
  } catch (error) {
    const message = error?.message || error?.shortMessage || '';
    if (typeof message === 'string' && message.toLowerCase().includes('already known')) {
      console.warn('⚠️ Stablecoin transaction already known by node, treating as success.');
      return {
        success: true,
        transactionHash: null,
        blockNumber: null,
        message: `${tokenSymbol} transaction already known by node`,
      };
    }
    console.error('❌ Error sending stablecoin:', error);
    throw error;
  }

  const rpcRequest = getRpcClient({ client, chain: selectedChain });
  let transactionReceipt = null;

  const checkTransactionReceipt = () => {
    return new Promise((resolve) => {
      const intervalId = setInterval(async () => {
        try {
          const receipt = await eth_getTransactionReceipt(rpcRequest, {
            hash: sentTransactionResult.transactionHash,
          });
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
      console.log('✅ Stablecoin transfer confirmed:', sentTransactionResult.transactionHash);
    } else {
      console.log('⏳ Stablecoin tx broadcast; receipt not yet available');
    }
  } catch (receiptError) {
    console.error('❌ Receipt check error:', receiptError);
  }

  return {
    success: true,
    transactionHash: sentTransactionResult.transactionHash,
    blockNumber: transactionReceipt?.blockNumber,
    message: `${tokenSymbol} sent successfully`,
  };
}

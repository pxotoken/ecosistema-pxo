import { getContract, prepareContractCall, sendTransaction, getGasPrice } from "thirdweb";
import { getRpcClient, eth_getTransactionReceipt } from "thirdweb/rpc";
import { getServerSupabase } from './supabase.js';
import { privateKeyToAccount } from "thirdweb/wallets";
import { polygonAmoy, polygon } from "thirdweb/chains";
import { getServerThirdwebClient } from './client.js';
import { getDecryptedWalletKey } from './crypto/keyManager.js';

const FORCE_POLYGON_MAINNET = process.env.FORCE_POLYGON_MAINNET === 'true';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy };

const PXO_TOKEN_ADDRESSES = {
  137: process.env.PXO_TOKEN_ADDRESS_MAINNET,
  80002: process.env.PXO_TOKEN_ADDRESS_TESTNET,
};

export async function sendPXOToUser({
  quantity,
  receiverAddress,
  chainId,
}) {
  const selectedChain = CHAIN_MAP[chainId] || (FORCE_POLYGON_MAINNET ? polygon : polygonAmoy);
  const pxoTokenAddress = PXO_TOKEN_ADDRESSES[selectedChain.id];

  if (!pxoTokenAddress) {
    throw new Error(`PXO token address not configured for chain ${selectedChain.id}`);
  }

  try {
    const SERVER_PRIVATE_KEY = await getDecryptedWalletKey();
    
    if (!SERVER_PRIVATE_KEY) {
      throw new Error("Server wallet private key not configured");
    }

    const client = getServerThirdwebClient();
    if (!client) {
      throw new Error("Server Thirdweb client not available. Check THIRDWEB_SECRET_KEY environment variable.");
    }

    const serverWallet = privateKeyToAccount({ 
      privateKey: SERVER_PRIVATE_KEY,
      client,
      chain: selectedChain 
    });

    const contract = getContract({
      address: pxoTokenAddress,
      client,
      chain: selectedChain,
    });

    console.log('📤 Sending PXO to user:', {
      receiverAddress,
      quantity: quantity.toString(),
      tokenAddress: pxoTokenAddress,
      chainId: selectedChain.id,
      chainName: selectedChain.name
    });

    // Get dynamic gas price with fallback
    let gasPrice;
    try {
      gasPrice = await getGasPrice({
        client,
        chain: selectedChain
      });
      console.log('💰 Gas price from network:', gasPrice);
      
      // Validate gas price - if it's too low for testnet, use fallback
      if (selectedChain.id === 80002 && gasPrice < BigInt(25000000000)) {
        console.log('⚠️ Gas price too low for testnet, using fallback');
        gasPrice = BigInt(30000000000); // 30 gwei fallback
      }
    } catch (error) {
      console.error('❌ Error getting gas price:', error);
      gasPrice = selectedChain.id === 80002 ? BigInt(30000000000) : BigInt(20000000000);
      console.log('💰 Using fallback gas price:', gasPrice);
    }

    // Prepare transfer transaction with dynamic gas price
    const transaction = prepareContractCall({
      contract,
      method: "function transfer(address to, uint256 value)",
      params: [receiverAddress, quantity],
      gas: BigInt(100000), // Set a reasonable gas limit
      gasPrice: gasPrice, // Use the validated gas price
    });

    // Send transaction
    const sentTransactionResult = await sendTransaction({
      transaction,
      account: serverWallet,
    });

    console.log('📤 Transaction sent:', sentTransactionResult.transactionHash);

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
        console.log('✅ Transaction confirmed:', { hash: sentTransactionResult.transactionHash, blockNumber: transactionReceipt.blockNumber });
      } else {
        console.log('⏳ PXO tx broadcast; receipt not yet available (hash:', sentTransactionResult.transactionHash, ')');
      }
    } catch (receiptError) {
      console.error('❌ Receipt check error:', receiptError);
    }

    return {
      success: true,
      transactionHash: sentTransactionResult.transactionHash,
      blockNumber: transactionReceipt?.blockNumber,
      message: 'PXO tokens sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending PXO:', error);
    throw new Error(`Failed to send PXO: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

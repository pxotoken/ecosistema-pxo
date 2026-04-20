import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { sendPXOToUser } from '../../lib/sendPXOToUser.js';
import { getServerLiquidity } from '../../lib/liquidity.js';
import { PricingService, BinancePriceProvider } from '../../lib/services/pricing/index.js';
import { getServerThirdwebClient } from '../../lib/client.js';
import { getContract, readContract } from 'thirdweb';
import { polygon, polygonAmoy } from 'thirdweb/chains';

const supabase = getServerSupabase();
const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy };
const PXO_TOKEN_ADDRESSES = {
  137: process.env.PXO_TOKEN_ADDRESS_MAINNET,
  80002: process.env.PXO_TOKEN_ADDRESS_TESTNET,
};

type SessionUser = { id: string; KYC_status?: string };

async function getCurrentUser(req: VercelRequest): Promise<SessionUser | null> {
  try {
    const cookies = req.headers.cookie;
    if (!cookies) {
      return null;
    }

    const jwtMatch = cookies.match(/pxo_jwt=([^;]+)/);
    if (!jwtMatch) {
      return null;
    }

    const userMatch = cookies.match(/pxo_user=([^;]+)/);
    if (userMatch) {
      try {
        const userData = JSON.parse(decodeURIComponent(userMatch[1])) as SessionUser;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Buy PXO API called');
    
    // Get current user from session
    const user = await getCurrentUser(req);
    
    if (!user) {
      console.error('❌ User not authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('✅ User authenticated:', user.id);

    if (user.KYC_status !== 'VALIDATED') {
      console.error('❌ User KYC not validated:', user.KYC_status);
      return res.status(403).json({ 
        error: 'KYC validation required',
        message: 'Debes completar y validar tu KYC para poder comprar PXO'
      });
    }
    
    const { transactionHash, amount, userAddress, tokenSymbol, expectedPrice, expectedPxoAmount, chainId } = req.body;

    console.log('📝 Purchase data:', { transactionHash, amount, userId: user.id, userAddress, tokenSymbol, expectedPrice, expectedPxoAmount, chainId });

    if (!transactionHash || !amount || !userAddress || !tokenSymbol) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const SUPPORTED_CHAINS = [137, 80002];
    if (!chainId) {
      return res.status(400).json({ error: 'Missing required chainId' });
    }
    if (!SUPPORTED_CHAINS.includes(chainId)) {
      return res.status(400).json({ error: `Unsupported chain ID: ${chainId}` });
    }

    // Get token information from database
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('symbol', tokenSymbol)
      .single();

    if (tokenError || !token) {
      console.error('❌ Error fetching token:', tokenError);
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Get buy price from pricing service (PXO/USDC or PXO/USDT maps to MXN/USDC or MXN/USDT)
    const pricingService = new PricingService(new BinancePriceProvider());
    const buyPriceResult = await pricingService.getBuyPrice(`PXO/${tokenSymbol}`);
    const exchangeRate = buyPriceResult.price;
    
    // Recalculate pxoAmount using the pricing service rate
    const calculatedPxoAmount = amount / exchangeRate;
    
    console.log('✅ Token found:', token.symbol);
    console.log('💰 Pricing Service - Exchange Rate:', exchangeRate);
    console.log('💰 Calculated PXO Amount:', calculatedPxoAmount);
    
    // Validate price consistency with frontend (if provided)
    if (expectedPrice !== undefined) {
      const priceDifference = Math.abs(exchangeRate - expectedPrice);
      const priceDifferencePercent = (priceDifference / expectedPrice) * 100;
      const PRICE_TOLERANCE_PERCENT = 2; // 2% tolerance
      
      if (priceDifferencePercent > PRICE_TOLERANCE_PERCENT) {
        console.error('❌ Price mismatch detected:', {
          expectedPrice,
          actualPrice: exchangeRate,
          difference: priceDifference,
          differencePercent: priceDifferencePercent.toFixed(2) + '%'
        });
        return res.status(400).json({ 
          error: 'Price has changed significantly. Please refresh and try again.',
          details: {
            expectedPrice,
            actualPrice: exchangeRate,
            differencePercent: priceDifferencePercent.toFixed(2) + '%',
            tolerance: PRICE_TOLERANCE_PERCENT + '%'
          }
        });
      }
      
      console.log('✅ Price validation passed:', {
        expectedPrice,
        actualPrice: exchangeRate,
        differencePercent: priceDifferencePercent.toFixed(2) + '%'
      });
    }

    // Liquidity check: do not sell more PXO than server wallet has
    const liquidity = await getServerLiquidity(chainId);
    const pxoLiquidity = liquidity?.pxo?.balance ?? 0;
    if (calculatedPxoAmount > pxoLiquidity) {
      console.error('❌ Insufficient PXO liquidity for purchase:', {
        requested: calculatedPxoAmount,
        available: pxoLiquidity,
      });
      return res.status(400).json({
        error: 'Not enough PXO liquidity to complete this purchase. Please reduce the amount or try again later.',
        details: {
          requestedPxo: calculatedPxoAmount,
          availablePxo: pxoLiquidity,
        },
      });
    }
    
    // Validate pxoAmount consistency with frontend (if provided)
    if (expectedPxoAmount !== undefined) {
      const amountDifference = Math.abs(calculatedPxoAmount - expectedPxoAmount);
      const amountDifferencePercent = (amountDifference / expectedPxoAmount) * 100;
      const AMOUNT_TOLERANCE_PERCENT = 2; // 2% tolerance
      
      if (amountDifferencePercent > AMOUNT_TOLERANCE_PERCENT) {
        console.error('❌ PXO amount mismatch detected:', {
          expectedPxoAmount,
          actualPxoAmount: calculatedPxoAmount,
          difference: amountDifference,
          differencePercent: amountDifferencePercent.toFixed(2) + '%'
        });
        return res.status(400).json({ 
          error: 'Calculated amount differs from expected. Please refresh and try again.',
          details: {
            expectedPxoAmount,
            actualPxoAmount: calculatedPxoAmount,
            differencePercent: amountDifferencePercent.toFixed(2) + '%',
            tolerance: AMOUNT_TOLERANCE_PERCENT + '%'
          }
        });
      }
      
      console.log('✅ Amount validation passed:', {
        expectedPxoAmount,
        actualPxoAmount: calculatedPxoAmount,
        differencePercent: amountDifferencePercent.toFixed(2) + '%'
      });
    }

    // Check if transaction hash already exists
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('tx_hash', transactionHash)
      .single();

    if (existingTransaction) {
      return res.status(400).json({ error: 'Transaction hash has already been used' });
    }

    const pxoUUID = uuidv4();

    // Create input transaction record (user sending token)
    const { data: inputTransaction, error: inputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'wallet',
        destination_uuid: pxoUUID,
        from_type: 'user',
        from_uuid: user.id,
        tx_hash: transactionHash,
        amount: amount,
        state: 'PENDIENTE'
      })
      .select()
      .single();

    if (inputError) {
      console.error('❌ Error creating input transaction:', inputError);
      return res.status(500).json({ error: 'Failed to create input transaction' });
    }

    console.log('✅ Input transaction created:', inputTransaction.id);

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from('trading_orders')
      .insert({
        user_id: user.id,
        order_type: 'BUY',
        currency_pair: `PXO/${tokenSymbol}`,
        base_amount: amount,
        quote_amount: calculatedPxoAmount,
        price: exchangeRate,
        status: 'OPEN',
        input_transaction_id: inputTransaction.id,
        chain_id: chainId || 137,
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    console.log('✅ Order created:', order.id);

    type ChainIdKey = keyof typeof CHAIN_MAP;
    const resolvedChainId = chainId as ChainIdKey;
    const selectedChain = CHAIN_MAP[resolvedChainId];
    const pxoContractAddress = PXO_TOKEN_ADDRESSES[resolvedChainId];
    if (!selectedChain || !pxoContractAddress) {
      return res.status(500).json({ error: 'PXO token address not configured for selected chain' });
    }

    let decimals = 18;
    try {
      const client = getServerThirdwebClient();
      if (!client) {
        throw new Error('Server Thirdweb client not available');
      }
      const pxoContract = getContract({
        address: pxoContractAddress,
        client,
        chain: selectedChain,
      });
      const onChainDecimals = await readContract({
        contract: pxoContract,
        method: 'function decimals() view returns (uint8)',
        params: [],
      });
      decimals = Number(onChainDecimals);
    } catch (decimalsError) {
      console.error('⚠️ Could not read PXO decimals on-chain, using fallback 18:', decimalsError);
    }

    const pxoQuantity = BigInt(Math.floor(calculatedPxoAmount * 10 ** decimals));
    
    console.log('📤 Attempting to send PXO to user:', {
      userAddress,
      pxoAmount: calculatedPxoAmount,
      pxoQuantity: pxoQuantity.toString()
    });

    let pxoResult;
    try {
      pxoResult = await sendPXOToUser({
        quantity: pxoQuantity,
        receiverAddress: userAddress,
        chainId: chainId || 137,
      });
      
      console.log('✅ PXO sent to user:', pxoResult.transactionHash);
    } catch (pxoError: unknown) {
      console.error('❌ Error sending PXO:', pxoError);

      await supabase
        .from('trading_orders')
        .update({ status: 'FAILED' })
        .eq('id', order.id);

      const msg = pxoError instanceof Error ? pxoError.message : String(pxoError);
      throw new Error(`Failed to send PXO tokens: ${msg}`);
    }

    const pxoTxHash = pxoResult.transactionHash;

    // Create output transaction record (system sending PXO)
    const { data: outputTransaction, error: outputError } = await supabase
      .from('transactions')
      .insert({
        destination_type: 'user',
        destination_uuid: user.id,
        from_type: 'wallet',
        from_uuid: pxoUUID,
        tx_hash: pxoTxHash,
        amount: calculatedPxoAmount,
        state: 'PAGO_FINALIZADO'
      })
      .select()
      .single();

    if (outputError) {
      console.error('❌ Error creating output transaction:', outputError);
      return res.status(500).json({ error: 'Failed to create output transaction' });
    }

    console.log('✅ Output transaction created:', outputTransaction.id);

    // Update order with output transaction
    const { error: updateError } = await supabase
      .from('trading_orders')
      .update({
        output_transaction_id: outputTransaction.id,
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      // Don't fail the request, just log the error
    }

    const result = {
      success: true,
      message: 'PXO purchase completed successfully',
      orderId: order.id,
      inputTransactionId: inputTransaction.id,
      outputTransactionId: outputTransaction.id,
      pxoAmount: calculatedPxoAmount,
      tokenAmount: amount,
      tokenSymbol: tokenSymbol,
      exchangeRate: exchangeRate,
      pxoTransactionHash: pxoTxHash
    };

    console.log('✅ Purchase completed:', result);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error in buy PXO API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

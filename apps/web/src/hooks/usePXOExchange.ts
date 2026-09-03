import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiError } from '../lib/api';
import { PATHS } from '../routes/paths';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { getThirdwebClient } from '../lib/client';
import { getContract } from 'thirdweb/contract';
import { getGasPrice } from 'thirdweb';
import { transfer, getBalance } from 'thirdweb/extensions/erc20';
import { sendTransaction } from 'thirdweb/transaction';
import { polygon } from 'thirdweb/chains';
import { useTokens } from './useTokens';
import { usePXOPrices } from './usePXOPrices';
import { useLiquidity } from './useLiquidity';
import { useAuthContext } from '../contexts/AuthContext';
import { KYCStatus } from '@pxo/shared/types';
import { isExternalAuthProvider } from '../lib/walletUtils';
import { sendTransactionWithSignatureDeadline, SignatureTimeoutError } from '../lib/signatureTransaction';

export type ExchangeSignatureCallbacks = {
  onBeforeSign?: () => void;
  onSignatureCountdown?: (secondsLeft: number | null) => void;
};

const FORCE_POLYGON_MAINNET = import.meta.env.VITE_FORCE_POLYGON_MAINNET === 'true';
const ENABLE_ADMIN_TESTNET = import.meta.env.VITE_ENABLE_ADMIN_TESTNET === 'true';
const SUPPORTED_CHAIN_IDS = new Set([137, 80002]);

export type ExchangeToken = 'USDC' | 'USDT';

const TOKEN_CONTRACTS: Record<number, { USDC: string; USDT: string }> = {
  137: {
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  },
  80002: {
    USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    USDT: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
  },
};

// No hardcoded fallback, deliberately — see the matching note in
// usePXOSell.ts. VITE_* is baked in at build time, so an unset variable
// ships as undefined with no startup error; defaulting to a literal is how
// production came to send real mainnet PXO to an unverified address (SL-001).
//
// BSC (chain 56) was dropped on 2026-09-02 per the chain-scope decision:
// Polygon only for this phase. It was already unreachable — SUPPORTED_CHAIN_IDS
// has only 137 and 80002, so the guard above rejected chain 56 before any of
// this was consulted.
const PXO_RECEIVER_ADDRESSES: Record<number, string | undefined> = {
  137: import.meta.env.VITE_POLYGON_PXO_RECEIVER_ADDRESS,
  80002: import.meta.env.VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS,
};

const RECEIVER_ENV_VAR: Record<number, string> = {
  137: 'VITE_POLYGON_PXO_RECEIVER_ADDRESS',
  80002: 'VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS',
};

// Previously this fell back to the mainnet entry for any unrecognised chain.
// Throwing here is surfaced correctly: getApiError() returns err.message for
// plain Errors, which is how the network guard in handleBuyPXO already works.
const getPXOReceiverAddress = (chainId: number): string => {
  const address = PXO_RECEIVER_ADDRESSES[chainId];
  if (!address) {
    const varName = RECEIVER_ENV_VAR[chainId];
    throw new Error(
      varName
        ? `No PXO receiver address configured for chain ${chainId}. Set ${varName} and rebuild — Vite bakes this in at build time, so setting it without a redeploy has no effect.`
        : `No PXO receiver address configured for chain ${chainId}, and that chain is not supported.`,
    );
  }
  return address;
};

const getTokenContractAddress = (chainId: number, tokenType: string): string =>
  TOKEN_CONTRACTS[chainId]?.[tokenType as 'USDC' | 'USDT'] ?? TOKEN_CONTRACTS[137].USDC;

export const usePXOExchange = (onPurchaseSuccess?: () => void) => {
  const [amount, setAmount] = useState<number>(0);
  const [pxoAmount, setPxoAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // User-selectable payment token. Prices, contract address, balance display,
  // and the backend /buy-pxo call all react to this.
  const [tokenSymbol, setTokenSymbol] = useState<ExchangeToken>('USDC');

  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const navigate = useNavigate();
  const { loading: tokensLoading, getTokenBySymbol } = useTokens();
  const { user } = useAuthContext();

  const token = getTokenBySymbol(tokenSymbol);
  
  // Get prices from pricing service
  const { buy: buyPrice, sell: sellPrice, loading: pricesLoading, error: pricesError } = usePXOPrices(tokenSymbol);
  const { liquidity, loading: liquidityLoading, error: liquidityError } = useLiquidity();
  const initialLoading = tokensLoading ||liquidityLoading;
  
  // Use pricing service buy price, fallback to token price or 1.12
  const exchangeRate = buyPrice || token?.pxo_buy_price || 1.12;

  // Calculate PXO amount based on token input (USDC or USDT)
  useEffect(() => {
    if (amount > 0 && exchangeRate) {
      const calculatedPXO = amount / exchangeRate;
      setPxoAmount(parseFloat(calculatedPXO.toFixed(8)));
    } else {
      setPxoAmount(0);
    }
  }, [amount, exchangeRate]);

  const handleBuyPXO = async (callbacks?: ExchangeSignatureCallbacks) => {
    if (!account || !wallet) {
      const msg = 'Please connect your wallet first';
      setError(msg);
      return { success: false, error: msg };
    }

    if (user?.KYC_status !== KYCStatus.VALIDATED) {
      const msg = 'You must complete and validate your KYC to buy PXO. Redirecting to Settings...';
      setError(msg);
      navigate(PATHS.dashboard.settings);
      return { success: false, error: msg };
    }

    if (amount <= 0) {
      const msg = 'Please enter a valid amount';
      setError(msg);
      return { success: false, error: msg };
    }

    // Client-side liquidity guard: cap purchase by server PXO balance
    if (liquidity?.pxo?.balance != null && pxoAmount > liquidity.pxo.balance) {
      const msg = `Not enough PXO liquidity to complete this purchase. Max available now is ${liquidity.pxo.balance.toFixed(
        4,
      )} PXO.`;
      setError(msg);
      return { success: false, error: msg };
    }

    // Check if Thirdweb client ID is configured
    const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
    if (!clientId) {
      const msg = 'Thirdweb client ID not configured. Please check your environment variables.';
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError(null);

    try {
      let activeChain = await wallet?.getChain();
      const isAdmin = user?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") || user?.mail === "admin@pxo.com";
      const shouldForceMainnet = FORCE_POLYGON_MAINNET && !(isAdmin && ENABLE_ADMIN_TESTNET && SUPPORTED_CHAIN_IDS.has(activeChain?.id ?? 0));

      if (shouldForceMainnet) {
        activeChain = polygon;
      }

      const resolvedChainId = activeChain?.id;
      if (!resolvedChainId || !SUPPORTED_CHAIN_IDS.has(resolvedChainId)) {
        throw new Error('Unsupported or missing wallet network. Please switch to Polygon Mainnet or Polygon Amoy.');
      }
      const chain = activeChain!;
      
      console.log('🔗 Active Chain Info:', JSON.stringify({
        chainId: resolvedChainId,
        name: activeChain?.name,
        testnet: activeChain?.testnet,
        forced: shouldForceMainnet,
      }));

      // Get client with error handling
      const client = getThirdwebClient();
      if (!client) {
        throw new Error('Thirdweb client not initialized. Please check your environment variables.');
      }

      const tokenContractAddress = getTokenContractAddress(resolvedChainId, tokenSymbol);

      const paymentContract = getContract({
        address: tokenContractAddress,
        client,
        chain,
      });

      const userBalance = await getBalance({
        contract: paymentContract,
        address: account.address,
      });

      if (Number(userBalance.displayValue) < amount) {
        throw new Error(`Insufficient ${tokenSymbol} balance. You have ${userBalance.displayValue} and need ${amount}.`);
      }
      console.log('🔍 Validating gas for transaction...');
      const gasValidation = await validateAndSubsidizeGas({
        userAddress: account.address,
        paymentAmount: amount,
        chain,
      });

      if (!gasValidation.success) {
        throw new Error(gasValidation.message);
      }

      // If subsidy was sent, wait a moment for confirmation
      if (gasValidation.needsSubsidy) {
        console.log('⏳ Gas subsidy sent, waiting for confirmation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      const contract = paymentContract;
      
      // Get dynamic gas price with fallback
      let gasPrice;
      try {
        gasPrice = await getGasPrice({
          client,
          chain
        });
        console.log('💰 Gas price from network:', gasPrice);
        
        // Validate gas price - if it's too low for testnet, use fallback
        if (activeChain?.id === 80002 && gasPrice < BigInt(25000000000)) {
          console.log('⚠️ Gas price too low for testnet, using fallback');
          gasPrice = BigInt(30000000000); // 30 gwei fallback
        }
      } catch (error) {
        console.error('❌ Error getting gas price:', error);
        gasPrice = activeChain?.id === 80002 ? BigInt(30000000000) : BigInt(20000000000);
        console.log('💰 Using fallback gas price:', gasPrice);
      }

      // Create transfer transaction with dynamic gas price
      const tx = transfer({
        amount: amount,
        contract,
        to: getPXOReceiverAddress(resolvedChainId),
        overrides: {
          gasPrice: gasPrice,
        },
      });

      console.log("Sending TX");

      let receipt;
      if (isExternalAuthProvider(user, wallet)) {
        receipt = await sendTransactionWithSignatureDeadline({
          send: () =>
            sendTransaction({
              transaction: tx,
              account,
            }),
          onBeforeSign: () => callbacks?.onBeforeSign?.(),
          onCountdown: callbacks?.onSignatureCountdown,
        });
      } else {
        callbacks?.onBeforeSign?.();
        receipt = await sendTransaction({
          transaction: tx,
          account,
        });
      }

      console.log('Transaction sent:', receipt.transactionHash);

      // Call backend to process the purchase
      // Send expected price and amount for validation
      const { data: result } = await api.post('/api/exchange/buy-pxo', {
        transactionHash: receipt.transactionHash,
        amount,
        userAddress: account.address,
        tokenSymbol,
        expectedPrice: exchangeRate,
        expectedPxoAmount: pxoAmount,
        chainId: resolvedChainId,
      });
      console.log('Purchase processed:', result);

      // Reset form
      setAmount(0);
      setPxoAmount(0);

      // Call success callback if provided
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        pxoAmount: pxoAmount,
        usdcAmount: amount,
      };

    } catch (err) {
      console.error('Error buying PXO:', err);
      if (err instanceof SignatureTimeoutError) {
        const msg =
          'Signature timed out. Dismiss any pending wallet prompt, then try again. Check the explorer if you may have signed after the timer.';
        setError(msg);
        return { success: false, error: msg };
      }
      const msg = getApiError(err, 'Failed to buy PXO');
      setError(msg);
      return {
        success: false,
        error: msg,
      };
    } finally {
      setLoading(false);
    }
  };

  // Gas subsidy validation function
  const validateAndSubsidizeGas = async ({
    userAddress,
    paymentAmount,
    chain
  }: {
    userAddress: string;
    paymentAmount: number;
    chain: any;
  }) => {
    try {
      console.log('🔍 Requesting gas subsidy...');
      
      const { data } = await api.post('/api/exchange/gas-subsidy', {
        userAddress,
        paymentAmount,
        chainId: chain.id,
        tokenType: tokenSymbol,
      });

      return {
        success: true,
        needsSubsidy: data.needsSubsidy,
        subsidyTxHash: data.subsidyTxHash,
        estimatedGas: data.estimatedGas,
        message: data.message,
      };

    } catch (err) {
      console.error('Error validating gas:', err);
      return {
        success: false,
        message: getApiError(err, 'Error validating gas requirements'),
        needsSubsidy: false,
      };
    }
  };

  return {
    amount,
    setAmount,
    pxoAmount,
    loading,
    initialLoading,
    error: error || pricesError || liquidityError,
    handleBuyPXO,
    // Payment token selection — component reads to render dropdown, writes on change.
    tokenSymbol,
    setTokenSymbol,
    // Exchange rate info (from pricing service, database, or fallback)
    exchangeRate,
    buyPrice,
    sellPrice,
    pricesLoading,
    pricesError,
    exchangeRateFormatted: `Exchange Rate: 1 PXO = ${exchangeRate} ${tokenSymbol}`,
  };
};

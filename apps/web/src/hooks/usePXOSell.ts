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
import { polygonAmoy, polygon } from 'thirdweb/chains';
import { usePXOPrices } from './usePXOPrices';
import { useLiquidity } from './useLiquidity';
import { useAuthContext } from '../contexts/AuthContext';
import { KYCStatus } from '@pxo/shared/types';
import { isExternalAuthProvider } from '../lib/walletUtils';
import { sendTransactionWithSignatureDeadline, SignatureTimeoutError } from '../lib/signatureTransaction';
import type { ExchangeSignatureCallbacks } from './usePXOExchange';

const FORCE_POLYGON_MAINNET = import.meta.env.VITE_FORCE_POLYGON_MAINNET === 'true';
const ENABLE_ADMIN_TESTNET = import.meta.env.VITE_ENABLE_ADMIN_TESTNET === 'true';
const SUPPORTED_CHAIN_IDS = new Set([137, 80002]);

const PXO_TOKEN_ADDRESSES: Record<number, string> = {
  137: import.meta.env.VITE_PXO_TOKEN_ADDRESS_MAINNET || '0xd6f9c21a585e2d77b62ec8c65ab9bec70e2b77d7',
  80002: import.meta.env.VITE_PXO_TOKEN_ADDRESS_TESTNET || '0xeda62cd0d29e077b98e0b61d905c4af906d8946c',
};

const PXO_RECEIVER_ADDRESSES: Record<number, string> = {
  137: import.meta.env.VITE_POLYGON_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
  80002: import.meta.env.VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS || '0x9f0f2eac50ad04d37d3bf3359735928126ac8382',
};

const getPXOReceiverAddress = (chainId: number): string =>
  PXO_RECEIVER_ADDRESSES[chainId] ?? PXO_RECEIVER_ADDRESSES[137];

const getPXOContractAddress = (chainId: number): string =>
  PXO_TOKEN_ADDRESSES[chainId] ?? PXO_TOKEN_ADDRESSES[137];

export const usePXOSell = (onSellSuccess?: () => void) => {
  const [pxoAmount, setPxoAmount] = useState<number>(0);
  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { sell: sellPrice, loading: pricesLoading, error: pricesError } = usePXOPrices('USDC');
  const { liquidity, loading: liquidityLoading, error: liquidityError } = useLiquidity();

  useEffect(() => {
    if (pxoAmount > 0 && sellPrice) {
      setUsdcAmount(Number.parseFloat((pxoAmount * sellPrice).toFixed(8)));
    } else {
      setUsdcAmount(0);
    }
  }, [pxoAmount, sellPrice]);

  const tokenSymbol = 'USDC';

  const validateAndSubsidizeGasForTransfer = async (params: {
    userAddress: string;
    chainId: number;
    pxoAmount: number;
  }) => {
    try {
      const { data } = await api.post('/api/exchange/gas-subsidy', {
        userAddress: params.userAddress,
        paymentAmount: params.pxoAmount,
        chainId: params.chainId,
        source: 'transfer',
        forPxoSell: true,
        tokenContractAddress: getPXOContractAddress(params.chainId),
        receiverAddress: getPXOReceiverAddress(params.chainId),
        tokenDecimals: params.chainId === 137 ? 6 : 18,
      });
      return {
        success: true,
        needsSubsidy: data.needsSubsidy,
        subsidyTxHash: data.subsidyTxHash,
        message: data.message,
      };
    } catch (err) {
      console.error('Error validating gas:', err);
      return { success: false, message: 'Error validating gas', needsSubsidy: false };
    }
  };

  const handleSellPXO = async (callbacks?: ExchangeSignatureCallbacks) => {
    if (!account || !wallet) {
      const msg = 'Please connect your wallet first';
      setError(msg);
      return { success: false, error: msg };
    }
    if (user?.KYC_status !== KYCStatus.VALIDATED) {
      const msg = 'You must complete and validate your KYC to sell PXO.';
      setError(msg);
      navigate(PATHS.dashboard.settings);
      return { success: false, error: msg };
    }
    if (pxoAmount <= 0) {
      const msg = 'Enter a valid PXO amount';
      setError(msg);
      return { success: false, error: msg };
    }

    // Client-side liquidity guard: cap PXO to sell by server USDC balance
    if (liquidity?.stable?.balance != null && sellPrice) {
      const maxPxoByLiquidity = liquidity.stable.balance / sellPrice;
      if (pxoAmount > maxPxoByLiquidity) {
        const msg = `Liquidity not enough to buy this amount of PXO. You can sell up to ${maxPxoByLiquidity.toFixed(
          4,
        )} PXO right now.`;
        setError(msg);
        return { success: false, error: msg };
      }
    }

    const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
    if (!clientId) {
      const msg = 'Thirdweb client ID not configured.';
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError(null);

    try {
      let activeChain = await wallet.getChain();
      const isAdmin =
        user?.user_type?.includes('989e3702-b515-4d6e-8627-fa0142a1a88f') || user?.mail === 'admin@pxo.com';
      const shouldForceMainnet =
        FORCE_POLYGON_MAINNET && !(isAdmin && ENABLE_ADMIN_TESTNET && SUPPORTED_CHAIN_IDS.has(activeChain?.id ?? 0));
      if (shouldForceMainnet) {
        activeChain = polygon;
      }

      const client = getThirdwebClient();
      if (!client) throw new Error('Thirdweb client not initialized.');

      const chainId = activeChain?.id ?? (FORCE_POLYGON_MAINNET ? 137 : 80002);
      const pxoAddress = getPXOContractAddress(chainId);
      if (!pxoAddress) throw new Error('PXO token not configured for this chain.');

      try {
        const { data: readiness } = await api.get<{
          ready: boolean;
          error?: string;
        }>('/api/exchange/sell-readiness', { params: { chainId } });
        if (!readiness.ready) {
          throw new Error(
            readiness.error ??
              'PXO sell is not available on this network (server not configured).',
          );
        }
      } catch (readinessErr) {
        throw new Error(getApiError(readinessErr, 'Unable to verify PXO sell availability'));
      }

      const pxoContract = getContract({
        address: pxoAddress,
        client,
        chain: activeChain ?? (FORCE_POLYGON_MAINNET ? polygon : polygonAmoy),
      });

      const balance = await getBalance({ contract: pxoContract, address: account.address });
      const balanceNum = Number(balance.displayValue);
      if (balanceNum < pxoAmount) {
        throw new Error(`Insufficient PXO balance. You have ${balanceNum.toFixed(4)} PXO.`);
      }

      const gasValidation = await validateAndSubsidizeGasForTransfer({
        userAddress: account.address,
        chainId,
        pxoAmount,
      });
      if (!gasValidation.success) throw new Error(gasValidation.message);
      if (gasValidation.needsSubsidy) {
        await new Promise((r) => setTimeout(r, 5000));
      }

      let gasPrice: bigint;
      try {
        gasPrice = await getGasPrice({
          client,
          chain: activeChain ?? (FORCE_POLYGON_MAINNET ? polygon : polygonAmoy),
        });
        if (chainId === 80002 && gasPrice < BigInt(25000000000)) {
          gasPrice = BigInt(30000000000);
        }
      } catch {
        gasPrice = chainId === 80002 ? BigInt(30000000000) : BigInt(20000000000);
      }

      const tx = transfer({
        amount: pxoAmount,
        contract: pxoContract,
        to: getPXOReceiverAddress(chainId),
        overrides: { gasPrice },
      });

      let receipt;
      if (isExternalAuthProvider(user, wallet)) {
        receipt = await sendTransactionWithSignatureDeadline({
          send: () => sendTransaction({ transaction: tx, account }),
          onBeforeSign: () => callbacks?.onBeforeSign?.(),
          onCountdown: callbacks?.onSignatureCountdown,
        });
      } else {
        callbacks?.onBeforeSign?.();
        receipt = await sendTransaction({ transaction: tx, account });
      }

      const { data: result } = await api.post('/api/exchange/sell-pxo', {
        transactionHash: receipt.transactionHash,
        pxoAmount,
        userAddress: account.address,
        tokenSymbol,
        expectedSellPrice: sellPrice,
        expectedUsdcAmount: usdcAmount,
        chainId,
      });
      setPxoAmount(0);
      setUsdcAmount(0);
      if (onSellSuccess) onSellSuccess();
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        pxoAmount,
        usdcAmount: result.usdcAmount ?? usdcAmount,
        orderId: result.orderId,
      };
    } catch (err) {
      if (err instanceof SignatureTimeoutError) {
        const msg =
          'Signature timed out. Dismiss any pending wallet prompt, then try again. Check the explorer if you may have signed after the timer.';
        setError(msg);
        return { success: false, error: msg };
      }
      const msg = getApiError(err, 'Failed to sell PXO');
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return {
    pxoAmount,
    setPxoAmount,
    usdcAmount,
    loading: loading || pricesLoading || liquidityLoading,
    error: error || pricesError || liquidityError,
    handleSellPXO,
    sellPrice,
    tokenSymbol,
  };
};

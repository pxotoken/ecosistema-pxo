import { useState } from 'react';
import api from '../lib/api';
import { useActiveAccount, useActiveWallet, useActiveWalletChain } from 'thirdweb/react';
import { getContract } from 'thirdweb/contract';
import { getGasPrice } from 'thirdweb';
import { transfer } from 'thirdweb/extensions/erc20';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { prepareTransaction } from 'thirdweb';
import { getWalletBalance } from 'thirdweb/wallets';
import { getBalance } from 'thirdweb/extensions/erc20';
import { getThirdwebClient } from '../lib/client';
import { Chain } from 'thirdweb';
import { useAuthContext } from '../contexts/AuthContext';
import { isExternalAuthProvider } from '../lib/walletUtils';
import { sendTransactionWithSignatureDeadline, SignatureTimeoutError } from '../lib/signatureTransaction';
import { getTokenDecimals } from '../lib/tokenDecimals';

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MIN_GAS_PRICE = BigInt(25000000000);
const FALLBACK_GAS_PRICE_TESTNET = BigInt(30000000000);
const FALLBACK_GAS_PRICE_MAINNET = BigInt(20000000000);

interface SendTokenParams {
  receiverAddress: string;
  amount: string;
  tokenAddress?: string;
  onAwaitingSignature?: (waiting: boolean) => void;
  onSignatureCountdown?: (secondsLeft: number | null) => void;
}

interface TokenBalanceResult {
  value: bigint;
  displayValue: string;
  symbol: string;
  name: string;
  decimals: number;
}

type SendStatus = 'idle' | 'sending' | 'confirming' | 'success' | 'error';

async function resolveGasPrice(client: any, chain: Chain): Promise<bigint> {
  try {
    const price = await getGasPrice({ client, chain });
    if (price < MIN_GAS_PRICE) {
      return chain.id === 80002 ? FALLBACK_GAS_PRICE_TESTNET : FALLBACK_GAS_PRICE_MAINNET;
    }
    return price;
  } catch {
    return chain.id === 80002 ? FALLBACK_GAS_PRICE_TESTNET : FALLBACK_GAS_PRICE_MAINNET;
  }
}

export function useSendToken() {
  const [status, setStatus] = useState<SendStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const client = getThirdwebClient();
  const { user } = useAuthContext();

  const send = async (params: SendTokenParams) => {
    const { receiverAddress, amount, tokenAddress, onAwaitingSignature, onSignatureCountdown } = params;

    if (!account || !wallet || !activeChain || !client) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    if (!receiverAddress || !/^0x[a-fA-F0-9]{40}$/.test(receiverAddress)) {
      setError('Invalid receiver address');
      setStatus('error');
      return;
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Invalid amount');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setError(null);
    setTxHash(null);

    try {
      const gasPrice = await resolveGasPrice(client, activeChain);
      const isNative = !tokenAddress || tokenAddress === ZERO_ADDRESS;

      if (!isNative) {
        try {
          // Read from the contract rather than a table. Both PXO entries in the
          // old table were wrong (mainnet is 6, Amoy is 8, both said 18).
          const decimals = await getTokenDecimals({
            client,
            chain: activeChain,
            address: tokenAddress,
          });
          const { data: subsidyData } = await api.post('/api/exchange/gas-subsidy', {
            userAddress: account.address,
            paymentAmount: numAmount,
            chainId: activeChain.id,
            source: 'transfer',
            tokenContractAddress: tokenAddress,
            receiverAddress,
            tokenDecimals: decimals,
          });
          if (subsidyData.needsSubsidy) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (subsidyErr) {
          console.error('Gas subsidy request failed, proceeding anyway:', subsidyErr);
        }
      }

      let receipt;

      const sendOnce = async () => {
        if (isNative) {
          const value = BigInt(Math.floor(numAmount * 1e18));
          const tx = prepareTransaction({
            chain: activeChain,
            client,
            to: receiverAddress,
            value,
            gasPrice,
          });
          return sendTransaction({ transaction: tx, account });
        }
        const contract = getContract({
          address: tokenAddress,
          client,
          chain: activeChain,
        });
        const tx = transfer({
          amount: numAmount,
          contract,
          to: receiverAddress,
          overrides: { gasPrice },
        });
        return sendTransaction({ transaction: tx, account });
      };

      if (isExternalAuthProvider(user, wallet)) {
        receipt = await sendTransactionWithSignatureDeadline({
          send: sendOnce,
          onBeforeSign: () => onAwaitingSignature?.(true),
          onCountdown: onSignatureCountdown,
        });
      } else {
        onAwaitingSignature?.(true);
        receipt = await sendOnce();
      }

      onAwaitingSignature?.(false);
      onSignatureCountdown?.(null);

      setTxHash(receipt.transactionHash);
      setStatus('confirming');

      await waitForReceipt({
        transactionHash: receipt.transactionHash,
        client,
        chain: activeChain,
      });

      setStatus('success');
    } catch (err: any) {
      params.onAwaitingSignature?.(false);
      params.onSignatureCountdown?.(null);

      if (err instanceof SignatureTimeoutError) {
        setError(
          'Signature timed out. Dismiss any pending wallet prompt, then try again. Check the explorer if you may have signed after the timer.',
        );
        setStatus('error');
        return;
      }

      const message = err?.message || 'Transaction failed';

      if (message.includes('user rejected') || message.includes('user closed modal') || message.includes('user denied')) {
        setError('Transaction rejected by user');
      } else if (message.includes('insufficient funds')) {
        setError('Insufficient funds');
      } else {
        setError(message);
      }
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  };

  const fetchBalance = async (tokenAddress?: string): Promise<TokenBalanceResult | null> => {
    if (!account || !activeChain || !client) return null;

    try {
      if (!tokenAddress || tokenAddress === ZERO_ADDRESS) {
        return await getWalletBalance({
          address: account.address,
          client,
          chain: activeChain,
        });
      }
      return await getBalance({
        contract: { client, address: tokenAddress as `0x${string}`, chain: activeChain },
        address: account.address,
      });
    } catch {
      return null;
    }
  };

  return {
    send,
    reset,
    fetchBalance,
    status,
    error,
    txHash,
    isPending: status === 'sending' || status === 'confirming',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}

import { useState, useEffect, useRef } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { getContract } from 'thirdweb/contract';
import { transfer } from 'thirdweb/extensions/erc20';
import { sendTransaction, getGasPrice } from 'thirdweb';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import api, { getApiError } from '../../lib/api';
import { getThirdwebClient } from '../../lib/client';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

const PXO_TOKEN_ADDRESSES: Record<number, string> = {
  137: import.meta.env.VITE_PXO_TOKEN_ADDRESS_MAINNET || '',
  80002: import.meta.env.VITE_PXO_TOKEN_ADDRESS_TESTNET || '',
};

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

type Status =
  | 'idle'
  | 'creating_intent'
  | 'awaiting_signature'
  | 'on_chain_pending'
  | 'spei_pending'
  | 'completed'
  | 'failed';

interface IntentState {
  intentId: string;
  treasuryAddress: string;
  pxoAmount: number;
  mxnAmount: number;
  chainId: number;
}

interface PollResponse {
  id: string;
  status: string;
  pxo_amount: string;
  mxn_amount: string;
  clabe: string;
  beneficiary_name: string;
  bitso_withdrawal_id: string | null;
  failure_reason: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function RedeemPxoToMxn() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { user } = useAuthContext();
  const { addToast } = useToast();

  const [pxoAmount, setPxoAmount] = useState('');
  const [clabe, setClabe] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [intent, setIntent] = useState<IntentState | null>(null);
  const [poll, setPoll] = useState<PollResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!intent) return;
    if (status !== 'spei_pending') return;

    const tick = async () => {
      try {
        const { data } = await api.get<PollResponse>(
          `/api/exchange/sell-pxo-mxn/${intent.intentId}`,
        );
        setPoll(data);
        if (data.status === 'COMPLETED') {
          setStatus('completed');
          addToast({
            type: 'success',
            title: 'SPEI completed',
            description: `$${intent.mxnAmount.toFixed(2)} MXN sent to CLABE ****${clabe.slice(-4)}`,
          });
        } else if (data.status === 'FAILED') {
          setStatus('failed');
          addToast({ type: 'error', title: 'SPEI failed', description: data.failure_reason ?? '' });
        }
      } catch (err) {
        console.warn('sell-pxo-mxn poll error', err);
      }
    };

    tick();
    pollTimer.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [intent, status, addToast, clabe]);

  const validateInputs = (): string | null => {
    const amount = Number(pxoAmount);
    if (!amount || amount <= 0) return 'Enter a valid PXO amount';
    if (!/^\d{18}$/.test(clabe)) return 'CLABE must be exactly 18 digits';
    if (!beneficiaryName.trim()) return 'Enter the beneficiary name';
    if (!account || !wallet) return 'Connect your wallet first';
    if (user?.KYC_status !== 'VALIDATED') return 'You need a validated KYC to withdraw';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validation = validateInputs();
    if (validation) {
      setError(validation);
      return;
    }

    const amount = Number(pxoAmount);
    const chain = await wallet!.getChain();
    const chainId = chain?.id ?? 80002;
    if (!(chainId in CHAIN_MAP)) {
      setError('Switch your wallet to Polygon or Polygon Amoy');
      return;
    }

    setStatus('creating_intent');
    let intentData: IntentState;
    try {
      const { data } = await api.post<{
        intentId: string;
        treasuryAddress: string;
        pxoAmount: number;
        mxnAmount: number;
        chainId: number;
      }>('/api/exchange/sell-pxo-mxn', {
        pxoAmount: amount,
        clabe,
        beneficiaryName,
        chainId,
      });
      intentData = {
        intentId: data.intentId,
        treasuryAddress: data.treasuryAddress,
        pxoAmount: data.pxoAmount,
        mxnAmount: data.mxnAmount,
        chainId: data.chainId,
      };
      setIntent(intentData);
    } catch (err) {
      setError(getApiError(err, 'Could not create the withdrawal'));
      setStatus('idle');
      return;
    }

    setStatus('awaiting_signature');

    // Sign + send PXO to treasury on-chain.
    let txHash: string;
    try {
      const client = getThirdwebClient();
      if (!client) throw new Error('Thirdweb client not initialized');
      const pxoAddress = PXO_TOKEN_ADDRESSES[chainId];
      if (!pxoAddress) throw new Error('PXO token address not configured');
      const selectedChain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
      const pxoContract = getContract({ address: pxoAddress, client, chain: selectedChain });

      let gasPrice: bigint;
      try {
        gasPrice = await getGasPrice({ client, chain: selectedChain });
        if (chainId === 80002 && gasPrice < BigInt(25_000_000_000)) {
          gasPrice = BigInt(30_000_000_000);
        }
      } catch {
        gasPrice = chainId === 80002 ? BigInt(30_000_000_000) : BigInt(20_000_000_000);
      }

      const tx = transfer({
        amount,
        contract: pxoContract,
        to: intentData.treasuryAddress,
        overrides: { gasPrice },
      });

      setStatus('on_chain_pending');
      const receipt = await sendTransaction({ transaction: tx, account: account! });
      txHash = receipt.transactionHash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'On-chain signature failed');
      setStatus('failed');
      return;
    }

    // Confirm with backend, which verifies the on-chain leg and triggers Bitso SPEI.
    try {
      await api.post(`/api/exchange/sell-pxo-mxn/${intentData.intentId}/confirm`, {
        transactionHash: txHash,
        userAddress: account!.address,
      });
      setStatus('spei_pending');
    } catch (err) {
      setError(getApiError(err, 'Backend confirmation failed'));
      setStatus('failed');
    }
  };

  const handleReset = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setPxoAmount('');
    setClabe('');
    setBeneficiaryName('');
    setStatus('idle');
    setIntent(null);
    setPoll(null);
    setError(null);
  };

  return (
    <div className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
          Withdraw PXO to MXN
        </h2>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          PXO is transferred to treasury first; the SPEI payout goes out afterward.
        </p>
      </div>

      {status === 'idle' && (
        <>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text">
            Amount in PXO
            <input
              type="number"
              min="1"
              step="0.01"
              value={pxoAmount}
              onChange={(e) => setPxoAmount(e.target.value)}
              placeholder="100.00"
              className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text">
            CLABE (18 digits)
            <input
              type="text"
              inputMode="numeric"
              maxLength={18}
              value={clabe}
              onChange={(e) => setClabe(e.target.value.replace(/\D/g, ''))}
              placeholder="012345678901234567"
              className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text">
            Beneficiary name
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              placeholder="As shown on the bank account"
              className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2"
            />
          </label>
          {pxoAmount && Number(pxoAmount) > 0 && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              You'll receive <span className="font-semibold">${Number(pxoAmount).toFixed(2)} MXN</span> in your bank account
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-lime-accent text-light-base dark:text-dark-base px-4 py-3 rounded-lg font-medium hover:shadow-glow transition-all"
          >
            Sign and withdraw
          </button>
        </>
      )}

      {status === 'creating_intent' && (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Creating withdrawal…
        </p>
      )}

      {status === 'awaiting_signature' && intent && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Approve the PXO transfer in your wallet…</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>Treasury: <code>{intent.treasuryAddress.slice(0, 8)}…{intent.treasuryAddress.slice(-6)}</code></div>
            <div>Amount: {intent.pxoAmount.toFixed(2)} PXO → ${intent.mxnAmount.toFixed(2)} MXN</div>
          </div>
        </div>
      )}

      {status === 'on_chain_pending' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Waiting for on-chain confirmation…</span>
        </div>
      )}

      {status === 'spei_pending' && intent && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Waiting for Bitso SPEI confirmation…</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>Intent: <code>{intent.intentId}</code></div>
            <div>Bitso withdrawal: <code>{poll?.bitso_withdrawal_id ?? '—'}</code></div>
            <div>Backend status: <code>{poll?.status ?? 'SPEI_SENT'}</code></div>
            <div>Beneficiary: {beneficiaryName} · CLABE ****{clabe.slice(-4)}</div>
          </div>
        </div>
      )}

      {status === 'completed' && intent && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Paid</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>${intent.mxnAmount.toFixed(2)} MXN sent to CLABE ****{clabe.slice(-4)}</div>
            {poll?.bitso_withdrawal_id && <div>Bitso wid: <code>{poll.bitso_withdrawal_id}</code></div>}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            New withdrawal
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">
            {error || poll?.failure_reason || 'The withdrawal did not complete.'}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

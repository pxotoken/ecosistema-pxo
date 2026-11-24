import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useActiveAccount, useActiveWallet, useActiveWalletChain } from 'thirdweb/react';
import { getContract } from 'thirdweb/contract';
import { transfer } from 'thirdweb/extensions/erc20';
import { sendTransaction, getGasPrice } from 'thirdweb';
import { polygon, polygonAmoy } from 'thirdweb/chains';
import api, { getApiError } from '../../lib/api';
import { getThirdwebClient } from '../../lib/client';
import { getPXOTokenAddress, hasPXOTokenAddress } from '../../lib/pxoToken';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useMaturityTerms } from '../../hooks/useFixedTermCds';
import { useToast } from '../ui/Toast';

const CHAIN_MAP = { 137: polygon, 80002: polygonAmoy } as const;

type Status =
  | 'idle'
  | 'creating'
  | 'awaiting_signature'
  | 'on_chain_pending'
  | 'confirming'
  | 'locked'
  | 'failed';

interface LockState {
  cdId: string;
  treasuryAddress: string;
  chainId: number;
  pxoAmount: string;
  termLabel: string;
  termDays: number;
  annualYieldPercent: number;
}

interface LockPxoCardProps {
  /** The catalogue product this certificate belongs to, from the URL slug. */
  investmentTypeId?: string;
  /** Called once a certificate is funded, so the list alongside can refresh. */
  onLocked?: () => void;
}

export function LockPxoCard({ investmentTypeId, onLocked }: LockPxoCardProps) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { user } = useAuthContext();
  const { addToast } = useToast();
  const { terms, loading: termsLoading, error: termsError } = useMaturityTerms();

  const [amount, setAmount] = useState('');
  const [termId, setTermId] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [lock, setLock] = useState<LockState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chainId = activeChain?.id;
  const tokenAddress =
    chainId && hasPXOTokenAddress(chainId) ? getPXOTokenAddress(chainId) : undefined;

  const {
    balance,
    displayBalance,
    loading: balanceLoading,
  } = useTokenBalance({
    tokenAddress,
    tokenSymbol: 'PXO',
    enabled: Boolean(tokenAddress),
  });

  const selectedTerm = terms.find((t) => t.id === termId);

  /**
   * Shown as an estimate only. The real maturity date is set by the backend
   * when the transfer is verified, because that is when the term starts —
   * signing can sit in a wallet for minutes, or be abandoned.
   */
  const estimatedMaturity = useMemo(() => {
    if (!selectedTerm) return null;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + selectedTerm.term_days);
    return d;
  }, [selectedTerm]);

  /**
   * "Max" fills the input with the FULL-PRECISION balance, not the rounded
   * figure in the label — same reasoning as the exchange screen: the rounded
   * value leaves dust behind.
   */
  const handleMax = () => {
    setAmount(displayBalance || '0');
    setError(null);
  };

  const validate = (): string | null => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) return 'Enter a valid PXO amount';
    if (!termId) return 'Choose a maturity term';
    if (!account || !wallet) return 'Connect your wallet first';
    if (user?.KYC_status !== 'VALIDATED') return 'You need a validated KYC to invest PXO';
    if (!chainId) return 'Your wallet is not reporting a network — reconnect it and try again';
    if (!(chainId in CHAIN_MAP)) return 'Switch your wallet to Polygon or Polygon Amoy';
    if (value > balance) return `You only have ${displayBalance} PXO available`;
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    // Narrowed by validate(), but the chain id is never defaulted — a wrong
    // guess here would lock funds on a network the certificate does not name.
    const resolvedChainId = chainId as keyof typeof CHAIN_MAP;

    setStatus('creating');
    let lockData: LockState;
    try {
      const { data } = await api.post<{
        cdId: string;
        treasuryAddress: string;
        chainId: number;
        pxoAmount: string;
        termLabel: string;
        termDays: number;
        annualYieldPercent: number;
      }>('/api/exchange/cd/locks', {
        pxoAmount: amount,
        termId,
        chainId: resolvedChainId,
        investmentTypeId,
      });
      lockData = {
        cdId: data.cdId,
        treasuryAddress: data.treasuryAddress,
        chainId: data.chainId,
        pxoAmount: data.pxoAmount,
        termLabel: data.termLabel,
        termDays: data.termDays,
        annualYieldPercent: data.annualYieldPercent,
      };
      setLock(lockData);
    } catch (err) {
      setError(getApiError(err, 'Could not open the certificate'));
      setStatus('idle');
      return;
    }

    setStatus('awaiting_signature');

    let txHash: string;
    try {
      const client = getThirdwebClient();
      if (!client) throw new Error('Thirdweb client not initialized');
      const selectedChain = CHAIN_MAP[resolvedChainId];
      const pxoContract = getContract({
        address: getPXOTokenAddress(resolvedChainId),
        client,
        chain: selectedChain,
      });

      let gasPrice: bigint;
      try {
        gasPrice = await getGasPrice({ client, chain: selectedChain });
        if (resolvedChainId === 80002 && gasPrice < BigInt(25_000_000_000)) {
          gasPrice = BigInt(30_000_000_000);
        }
      } catch {
        gasPrice = resolvedChainId === 80002 ? BigInt(30_000_000_000) : BigInt(20_000_000_000);
      }

      const tx = transfer({
        amount,
        contract: pxoContract,
        to: lockData.treasuryAddress,
        overrides: { gasPrice },
      });

      setStatus('on_chain_pending');
      const receipt = await sendTransaction({ transaction: tx, account: account! });
      txHash = receipt.transactionHash;
    } catch (err) {
      // The certificate stays AWAITING_PXO and unfunded. Nothing was locked.
      setError(err instanceof Error ? err.message : 'On-chain signature failed');
      setStatus('failed');
      return;
    }

    setStatus('confirming');
    try {
      await api.post(`/api/exchange/cd/locks/${lockData.cdId}/confirm`, {
        transactionHash: txHash,
        userAddress: account!.address,
      });
      setStatus('locked');
      addToast({
        type: 'success',
        title: 'PXO locked',
        description: `${lockData.pxoAmount} PXO committed for ${lockData.termLabel}`,
      });
      onLocked?.();
    } catch (err) {
      // The transfer went through but the backend would not activate it. Say so
      // plainly and do NOT offer a retry that would send a second transfer.
      setError(
        `${getApiError(err, 'Backend confirmation failed')} — your transaction hash is ${txHash}. Do not send again; contact support with this hash.`,
      );
      setStatus('failed');
    }
  };

  const handleReset = () => {
    setAmount('');
    setTermId('');
    setStatus('idle');
    setLock(null);
    setError(null);
  };

  return (
    <div className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-pxo-primary/10 rounded-lg">
          <Lock className="w-5 h-5 text-pxo-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
            Lock PXO for a fixed term
          </h2>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Your PXO is transferred to PXO treasury custody for the term you choose, and returned
            with its yield at maturity.
          </p>
        </div>
      </div>

      {status === 'idle' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="cd-amount"
                className="block text-sm font-medium text-light-text dark:text-dark-text"
              >
                Amount in PXO
              </label>
              <button
                type="button"
                onClick={handleMax}
                disabled={balanceLoading || balance <= 0}
                className="text-xs text-brand-accent hover:text-brand-accent/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Max
              </button>
            </div>
            <input
              id="cd-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2"
            />
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {balanceLoading ? 'Loading balance…' : `Available: ${displayBalance} PXO`}
            </p>
          </div>

          <div>
            <label
              htmlFor="cd-term"
              className="block text-sm font-medium text-light-text dark:text-dark-text mb-2"
            >
              Maturity term
            </label>
            <select
              id="cd-term"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              disabled={termsLoading || terms.length === 0}
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2 disabled:opacity-50"
            >
              <option value="">
                {termsLoading
                  ? 'Loading terms…'
                  : terms.length === 0
                    ? 'No terms available'
                    : 'Select a term'}
              </option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label} — {Number(term.baseline_annual_yield_percent).toFixed(2)}% per year
                </option>
              ))}
            </select>
            {termsError && <p className="mt-1 text-xs text-red-500">{termsError}</p>}
          </div>

          {selectedTerm && estimatedMaturity && (
            <div className="bg-light-base dark:bg-dark-base border border-light-border dark:border-dark-border rounded-lg p-3 text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
              <div>
                Term: {selectedTerm.term_days} days · rate{' '}
                {Number(selectedTerm.baseline_annual_yield_percent).toFixed(2)}% per year
              </div>
              <div>
                Matures around {estimatedMaturity.toLocaleDateString()} — the exact date is set when
                your transfer is confirmed.
              </div>
              <div>
                The final amount is calculated at maturity. Funds cannot be withdrawn before then.
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-brand-accent text-white px-4 py-3 rounded-lg font-medium hover:shadow-glow transition-all"
          >
            Lock PXO
          </button>
        </>
      )}

      {status === 'creating' && (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Opening the certificate…
        </p>
      )}

      {status === 'awaiting_signature' && lock && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Approve the PXO transfer in your wallet…</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>
              Treasury: <code>{lock.treasuryAddress.slice(0, 8)}…{lock.treasuryAddress.slice(-6)}</code>
            </div>
            <div>
              {lock.pxoAmount} PXO · {lock.termLabel} · {lock.annualYieldPercent.toFixed(2)}% per year
            </div>
          </div>
        </div>
      )}

      {status === 'on_chain_pending' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Waiting for on-chain confirmation…</span>
        </div>
      )}

      {status === 'confirming' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Verifying the transfer and activating your certificate…</span>
        </div>
      )}

      {status === 'locked' && lock && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Locked</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {lock.pxoAmount} PXO committed for {lock.termLabel}. It appears in your certificates
            below.
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Lock more PXO
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{error || 'The certificate was not opened.'}</p>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

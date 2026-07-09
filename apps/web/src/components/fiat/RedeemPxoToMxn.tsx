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
            title: 'SPEI completado',
            description: `$${intent.mxnAmount.toFixed(2)} MXN enviados a CLABE ****${clabe.slice(-4)}`,
          });
        } else if (data.status === 'FAILED') {
          setStatus('failed');
          addToast({ type: 'error', title: 'SPEI fallido', description: data.failure_reason ?? '' });
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
    if (!amount || amount <= 0) return 'Ingresá un monto válido en PXO';
    if (!/^\d{18}$/.test(clabe)) return 'La CLABE debe tener 18 dígitos';
    if (!beneficiaryName.trim()) return 'Ingresá el nombre del beneficiario';
    if (!account || !wallet) return 'Conectá tu wallet primero';
    if (user?.KYC_status !== 'VALIDATED') return 'Necesitás KYC validado para redimir';
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
      setError('Cambiá tu wallet a Polygon o Polygon Amoy');
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
      setError(getApiError(err, 'No se pudo crear la intención de redención'));
      setStatus('idle');
      return;
    }

    setStatus('awaiting_signature');

    // Sign + send PXO to treasury on-chain.
    let txHash: string;
    try {
      const client = getThirdwebClient();
      if (!client) throw new Error('Thirdweb client no inicializado');
      const pxoAddress = PXO_TOKEN_ADDRESSES[chainId];
      if (!pxoAddress) throw new Error('PXO token address no configurada');
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
      setError(err instanceof Error ? err.message : 'Falló la firma on-chain');
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
      setError(getApiError(err, 'Falló la confirmación del backend'));
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
          Redimir PXO a MXN
        </h2>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Los PXO se transfieren a tesorería primero; el SPEI sale después.
        </p>
      </div>

      {status === 'idle' && (
        <>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text">
            Monto en PXO
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
            CLABE (18 dígitos)
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
            Nombre del beneficiario
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              placeholder="Como aparece en la cuenta"
              className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2"
            />
          </label>
          {pxoAmount && Number(pxoAmount) > 0 && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Recibirás <span className="font-semibold">${Number(pxoAmount).toFixed(2)} MXN</span> en tu cuenta bancaria
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-lime-accent text-light-base dark:text-dark-base px-4 py-3 rounded-lg font-medium hover:shadow-glow transition-all"
          >
            Firmar y redimir
          </button>
        </>
      )}

      {status === 'creating_intent' && (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Creando intención de redención…
        </p>
      )}

      {status === 'awaiting_signature' && intent && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Aprobá la transferencia de PXO en tu wallet…</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>Tesorería: <code>{intent.treasuryAddress.slice(0, 8)}…{intent.treasuryAddress.slice(-6)}</code></div>
            <div>Monto: {intent.pxoAmount.toFixed(2)} PXO → ${intent.mxnAmount.toFixed(2)} MXN</div>
          </div>
        </div>
      )}

      {status === 'on_chain_pending' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Esperando confirmación on-chain…</span>
        </div>
      )}

      {status === 'spei_pending' && intent && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Esperando confirmación de Bitso SPEI…</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>Intent: <code>{intent.intentId}</code></div>
            <div>Bitso withdrawal: <code>{poll?.bitso_withdrawal_id ?? '—'}</code></div>
            <div>Estado backend: <code>{poll?.status ?? 'SPEI_SENT'}</code></div>
            <div>Beneficiario: {beneficiaryName} · CLABE ****{clabe.slice(-4)}</div>
          </div>
        </div>
      )}

      {status === 'completed' && intent && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Pagado</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>${intent.mxnAmount.toFixed(2)} MXN enviados a CLABE ****{clabe.slice(-4)}</div>
            {poll?.bitso_withdrawal_id && <div>Bitso wid: <code>{poll.bitso_withdrawal_id}</code></div>}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Nueva redención
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">
            {error || poll?.failure_reason || 'La redención no se completó.'}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { PATHS } from '../../routes/paths';

type UiStatus =
  | 'idle'
  | 'creating'
  | 'awaiting_spei'
  | 'matched'
  | 'completed'
  | 'expired'
  | 'failed';

interface CreateIntentResponse {
  intentId: string;
  tradingOrderId: string;
  destinationClabe: string;
  beneficiaryName: string;
  amountMxn: number;
  pxoAmount: number;
  numericReference: string;
  sourceClabe: string;
  expiresAt: string;
  chainId: number;
  status: string;
  message: string;
}

interface PollResponse {
  id: string;
  status: string;
  amountMxn: number;
  pxoAmount: number;
  destinationClabe: string;
  sourceClabe: string;
  numericReference: string | null;
  chainId: number;
  bitsoFundingId: string | null;
  pxoTransactionHash: string | null;
  failureReason: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const POLL_INTERVAL_MS = 5_000;
const TERMINAL_STATUSES = new Set(['COMPLETED', 'EXPIRED', 'FAILED']);

function CopyableField({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (err) {
      console.error('CopyableField: clipboard write failed', err);
    }
  };

  return (
    <div>
      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 bg-light-base dark:bg-dark-base border border-light-border dark:border-dark-border rounded-lg px-3 py-2">
        <span
          className={`flex-1 text-sm text-light-text dark:text-dark-text break-all ${
            mono ? 'font-mono tracking-wide' : ''
          }`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-pxo-primary" />
          )}
        </button>
      </div>
    </div>
  );
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00:00';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BuyPxoWithMxn() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { user } = useAuthContext();
  const { addToast } = useToast();

  const [amountMxn, setAmountMxn] = useState('');
  const [uiStatus, setUiStatus] = useState<UiStatus>('idle');
  const [intent, setIntent] = useState<CreateIntentResponse | null>(null);
  const [poll, setPoll] = useState<PollResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clabeRegistered = Boolean(user?.CLABE && /^\d{18}$/.test(user.CLABE));

  // Poll backend state until terminal.
  useEffect(() => {
    if (!intent) return;
    if (uiStatus === 'completed' || uiStatus === 'expired' || uiStatus === 'failed') return;

    const tick = async () => {
      try {
        const { data } = await api.get<PollResponse>(
          `/api/exchange/buy-pxo-mxn/${intent.intentId}`,
        );
        setPoll(data);
        if (data.status === 'COMPLETED') {
          setUiStatus('completed');
          addToast({
            type: 'success',
            title: 'PXO acreditado',
            description: `${data.pxoAmount.toFixed(2)} PXO en tu wallet`,
          });
        } else if (data.status === 'MATCHED') {
          setUiStatus('matched');
        } else if (data.status === 'EXPIRED') {
          setUiStatus('expired');
        } else if (data.status === 'FAILED') {
          setUiStatus('failed');
          addToast({
            type: 'error',
            title: 'Depósito fallido',
            description: data.failureReason ?? 'Contacta a soporte',
          });
        }
      } catch (err) {
        console.warn('buy-pxo-mxn poll error', err);
      }
    };

    tick();
    pollTimer.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [intent, uiStatus, addToast]);

  // Live countdown clock — updates every second while awaiting.
  useEffect(() => {
    if (!intent) return;
    if (uiStatus === 'completed' || uiStatus === 'expired' || uiStatus === 'failed') return;
    clockTimer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (clockTimer.current) clearInterval(clockTimer.current);
    };
  }, [intent, uiStatus]);

  const handleSubmit = async () => {
    setError(null);
    const amount = Number(amountMxn);
    if (!amount || amount <= 0) {
      setError('Ingresa un monto válido en MXN');
      return;
    }
    if (!account || !wallet) {
      setError('Conecta tu wallet primero');
      return;
    }
    if (!clabeRegistered) {
      setError('Registra tu CLABE en Configuración antes de depositar');
      return;
    }

    setUiStatus('creating');
    try {
      const chain = await wallet.getChain();
      const { data } = await api.post<CreateIntentResponse>('/api/exchange/buy-pxo-mxn', {
        amountMxn: amount,
        userAddress: account.address,
        chainId: chain?.id ?? 80002,
      });
      setIntent(data);
      setUiStatus('awaiting_spei');
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const errBody = (err as { response?: { data?: { error?: string; message?: string } } })
        .response?.data;
      if (status === 400 && errBody?.error === 'CLABE_NOT_REGISTERED') {
        setError(errBody.message ?? 'Registra tu CLABE en Configuración');
      } else {
        setError(getApiError(err, 'No se pudo crear la orden de depósito'));
      }
      setUiStatus('idle');
    }
  };

  const handleReset = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (clockTimer.current) clearInterval(clockTimer.current);
    setAmountMxn('');
    setUiStatus('idle');
    setIntent(null);
    setPoll(null);
    setError(null);
  }, []);

  const msRemaining = intent ? new Date(intent.expiresAt).getTime() - now : 0;
  const expiredByClock = intent && msRemaining <= 0 && uiStatus === 'awaiting_spei';

  useEffect(() => {
    if (expiredByClock) setUiStatus('expired');
  }, [expiredByClock]);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  if (!clabeRegistered && uiStatus === 'idle' && !intent) {
    return (
      <div className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
            Comprar PXO con MXN (SPEI)
          </h2>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Registra tu CLABE bancaria para poder depositar por SPEI.
          </p>
        </div>
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">CLABE bancaria requerida</p>
            <p>
              Para depositar MXN necesitas tener registrada tu CLABE en Configuración. Los depósitos
              solo se aceptan desde esa cuenta.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(PATHS.dashboard.settings)}
          className="w-full bg-pxo-primary text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Ir a Configuración
        </button>
      </div>
    );
  }

  return (
    <div className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
          Comprar PXO con MXN (SPEI)
        </h2>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Envía SPEI desde tu CLABE registrada. Los PXO se acreditan automáticamente al recibir el
          depósito (1:1 con MXN).
        </p>
      </div>

      {uiStatus === 'idle' && (
        <>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text">
            Monto en MXN
            <input
              type="number"
              min="1"
              step="0.01"
              value={amountMxn}
              onChange={(e) => setAmountMxn(e.target.value)}
              placeholder="100.00"
              className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2 text-base focus:outline-none focus:border-pxo-primary/50"
            />
          </label>
          {amountMxn && Number(amountMxn) > 0 && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Recibirás{' '}
              <span className="font-semibold text-light-text dark:text-dark-text">
                {Number(amountMxn).toFixed(2)} PXO
              </span>{' '}
              (1:1 con MXN)
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-pxo-primary text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Crear instrucciones de pago
          </button>
        </>
      )}

      {uiStatus === 'creating' && (
        <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creando orden…</span>
        </div>
      )}

      {(uiStatus === 'awaiting_spei' || uiStatus === 'matched') && intent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  uiStatus === 'matched'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-light-text dark:text-dark-text">
                {uiStatus === 'matched'
                  ? 'Depósito detectado, acreditando PXO…'
                  : 'Esperando tu SPEI…'}
              </span>
            </div>
            {uiStatus === 'awaiting_spei' && (
              <span className="font-mono text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {formatCountdown(msRemaining)}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 rounded-r-lg text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Debes enviar desde tu CLABE registrada (****{intent.sourceClabe.slice(-4)}). SPEI
              desde otra cuenta no será acreditado y quedará pendiente de revisión manual.
            </span>
          </div>

          <div className="space-y-3">
            <CopyableField label="CLABE destino" value={intent.destinationClabe} />
            <CopyableField label="Beneficiario" value={intent.beneficiaryName} mono={false} />
            <CopyableField label="Monto (MXN)" value={intent.amountMxn.toFixed(2)} />
            <CopyableField label="Referencia numérica" value={intent.numericReference} />
          </div>

          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1 pt-2 border-t border-light-border/40 dark:border-dark-border/40">
            <div>
              Intent: <code>{intent.intentId.slice(0, 8)}…</code>
            </div>
            <div>
              Estado backend: <code>{poll?.status ?? 'PENDING'}</code>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {uiStatus === 'completed' && intent && poll && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium">PXO acreditado</span>
          </div>
          <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>
              <span className="font-semibold text-light-text dark:text-dark-text">
                {intent.pxoAmount.toFixed(2)} PXO
              </span>{' '}
              recibidos en tu wallet
            </div>
            {poll.pxoTransactionHash && (
              <div>
                Tx on-chain:{' '}
                <code className="text-xs">
                  {poll.pxoTransactionHash.slice(0, 10)}…{poll.pxoTransactionHash.slice(-8)}
                </code>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-pxo-primary hover:underline"
          >
            Nueva compra
          </button>
        </div>
      )}

      {uiStatus === 'expired' && (
        <div className="space-y-2">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            La orden expiró sin recibir el depósito. Si ya enviaste el SPEI y no se acreditó,
            contacta a soporte.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-pxo-primary hover:underline"
          >
            Crear nueva orden
          </button>
        </div>
      )}

      {uiStatus === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">
            La compra falló: {poll?.failureReason ?? 'error desconocido'}.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-pxo-primary hover:underline"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

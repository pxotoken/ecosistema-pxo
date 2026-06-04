import { useState, useEffect, useRef } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import api, { getApiError } from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

type Status =
  | 'idle'
  | 'creating'
  | 'awaiting_payment'
  | 'confirming'
  | 'completed'
  | 'failed';

interface OrderState {
  tradingOrderId: string;
  conektaOrderId: string;
  checkoutUrl: string;
  amountMxn: number;
  pxoAmount: number;
}

interface PollResponse {
  id: string;
  status: string;
  amountMxn: number;
  pxoAmount: number;
  pxoTransactionHash: string | null;
  completedAt: string | null;
}

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);

export function BuyPxoWithMxn() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { user } = useAuthContext();
  const { addToast } = useToast();

  const [amountMxn, setAmountMxn] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [order, setOrder] = useState<OrderState | null>(null);
  const [poll, setPoll] = useState<PollResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll the order status until it reaches a terminal state.
  useEffect(() => {
    if (!order) return;
    if (status === 'completed' || status === 'failed') return;

    const tick = async () => {
      try {
        const { data } = await api.get<PollResponse>(
          `/api/exchange/buy-pxo-mxn/${order.tradingOrderId}`,
        );
        setPoll(data);
        if (data.status === 'COMPLETED') {
          setStatus('completed');
          addToast({
            type: 'success',
            title: 'PXO acreditado',
            description: `${order.pxoAmount.toFixed(2)} PXO en tu wallet`,
          });
        } else if (data.status === 'FAILED') {
          setStatus('failed');
          addToast({ type: 'error', title: 'Compra fallida' });
        } else if (data.status === 'PROCESSING') {
          setStatus('confirming');
        }
      } catch (err) {
        // Soft-fail polling; we'll try again on next tick.
        console.warn('buy-pxo-mxn poll error', err);
      }
    };

    tick();
    pollTimer.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [order, status, addToast]);

  const handleSubmit = async () => {
    setError(null);
    const amount = Number(amountMxn);
    if (!amount || amount <= 0) {
      setError('Ingresá un monto válido en MXN');
      return;
    }
    if (!account || !wallet) {
      setError('Conectá tu wallet primero');
      return;
    }
    if (!user?.mail) {
      setError('Tu cuenta no tiene email asociado');
      return;
    }

    setStatus('creating');
    try {
      const chain = await wallet.getChain();
      const { data } = await api.post<{
        tradingOrderId: string;
        conektaOrderId: string;
        checkoutUrl: string;
        amountMxn: number;
        pxoAmount: number;
      }>('/api/exchange/buy-pxo-mxn', {
        amountMxn: amount,
        userAddress: account.address,
        chainId: chain?.id ?? 80002,
        customerName: user.first_name
          ? `${user.first_name} ${user.last_name ?? ''}`.trim()
          : 'PXO User',
        customerEmail: user.mail,
      });
      setOrder({
        tradingOrderId: data.tradingOrderId,
        conektaOrderId: data.conektaOrderId,
        checkoutUrl: data.checkoutUrl,
        amountMxn: data.amountMxn,
        pxoAmount: data.pxoAmount,
      });
      setStatus('awaiting_payment');
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const msg = getApiError(err, 'No se pudo crear la orden');
      setError(msg);
      setStatus('idle');
    }
  };

  const handleReset = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setAmountMxn('');
    setStatus('idle');
    setOrder(null);
    setPoll(null);
    setError(null);
  };

  return (
    <div className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
          Comprar PXO con MXN
        </h2>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Pago vía Conekta — los PXO se acreditan al confirmarse el depósito en Bitso.
        </p>
      </div>

      {status === 'idle' && (
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
              className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2 text-base focus:outline-none focus:border-lime-accent/50"
            />
          </label>
          {amountMxn && Number(amountMxn) > 0 && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Recibirás <span className="font-semibold">{Number(amountMxn).toFixed(2)} PXO</span> (1:1 con MXN)
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-lime-accent text-light-base dark:text-dark-base px-4 py-3 rounded-lg font-medium hover:shadow-glow transition-all"
          >
            Pagar con Conekta
          </button>
        </>
      )}

      {status === 'creating' && (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Creando orden en Conekta…
        </p>
      )}

      {(status === 'awaiting_payment' || status === 'confirming') && order && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-light-text dark:text-dark-text">
              {status === 'awaiting_payment'
                ? 'Esperando pago en Conekta…'
                : 'Esperando confirmación de Bitso…'}
            </span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>Orden Conekta: <code>{order.conektaOrderId}</code></div>
            <div>Monto: ${order.amountMxn.toFixed(2)} MXN → {order.pxoAmount.toFixed(2)} PXO</div>
            <div>Estado backend: <code>{poll?.status ?? 'OPEN'}</code></div>
          </div>
          <a
            href={order.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-lime-accent hover:underline"
          >
            Abrir checkout de Conekta
          </a>
        </div>
      )}

      {status === 'completed' && order && poll && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>PXO acreditado</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <div>{order.pxoAmount.toFixed(2)} PXO recibidos</div>
            {poll.pxoTransactionHash && (
              <div>Tx on-chain: <code>{poll.pxoTransactionHash.slice(0, 10)}…{poll.pxoTransactionHash.slice(-8)}</code></div>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
          >
            Nueva compra
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">La compra no se completó.</p>
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

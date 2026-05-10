import { useEffect, useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  generatePayment,
  getPaymentStatus,
  type GeneratePaymentResponse,
  type PaymentStatusResponse,
} from '../lib/api';
import { POS_MERCHANT_ID, POS_POS_ID } from '../config/env';

interface Props {
  onBack: () => void;
  onConfirmed: (title: string, subtitle: string, amount: string) => void;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shortHash(hash: string | undefined): string {
  if (!hash) return '';
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

const POLL_INTERVAL_MS = 3_000;
const MAX_ERRORS = 4;

export function Cobrar({ onBack, onConfirmed }: Props) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<GeneratePaymentResponse | null>(null);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pollErrorCount, setPollErrorCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async () => {
    const num = Number.parseFloat(amount);
    if (!num || num <= 0) {
      setError('Ingresá un monto en MXN.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await generatePayment({ amount: num, reference: reference || undefined });
      setPayment(res);
      setStatus(null);
      setPollErrorCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el cobro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!payment) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const s = await getPaymentStatus(payment.paymentId);
        if (!cancelled) {
          setStatus(s);
          setNow(Date.now());
          setPollErrorCount(0);
        }
      } catch {
        if (!cancelled) setPollErrorCount((c) => c + 1);
      }
    };

    void poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    const ticker = setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(ticker);
    };
  }, [payment]);

  useEffect(() => {
    if (status?.status === 'CONFIRMED') {
      if (pollRef.current) clearInterval(pollRef.current);
      onConfirmed(
        '¡Cobro confirmado!',
        `Tx: ${shortHash(status.txHash)}`,
        status.amountMXN.toFixed(2),
      );
    }
  }, [status, onConfirmed]);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPayment(null);
    setStatus(null);
    setAmount('');
    setReference('');
    setPollErrorCount(0);
  };

  if (payment) {
    const remaining = new Date(payment.expiresAt).getTime() - now;
    const expired = status?.status === 'EXPIRED' || remaining <= 0;
    const hasTx = !!(status?.txHash);
    const pollFailed = pollErrorCount >= MAX_ERRORS;

    let statusBadgeColor = 'bg-slate-500/15 text-slate-400';
    let dotColor = 'bg-slate-400';
    let statusText = '';

    if (expired) {
      statusBadgeColor = 'bg-red-500/15 text-red-400';
      dotColor = 'bg-red-400';
      statusText = 'Expirado';
    } else if (hasTx) {
      statusBadgeColor = 'bg-green-500/15 text-green-500';
      dotColor = 'bg-green-500';
      statusText = 'Pago completado';
    } else {
      statusText = `Esperando pago · expira en ${formatMs(remaining)}`;
    }

    return (
      <>
        <ScreenHeader title="Cobro generado" onBack={onBack} />

        <div className="flex flex-col items-center gap-4 px-6 py-4 text-center overflow-y-auto flex-1">
          <p className="text-sm text-slate-400">Mostrá este QR al cliente para que pague</p>
          <img
            src={payment.qrData}
            alt="QR de cobro"
            className="w-52 h-52 rounded-xl bg-white p-2.5 shadow-md mx-auto"
          />
          <p className="text-2xl font-semibold">${payment.amountMXN.toFixed(2)} MXN</p>

          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${statusBadgeColor}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            {statusText}
          </span>

          {hasTx && (
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#eff6ff',
                fontSize: 12,
                color: '#3b82f6',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {shortHash(status?.txHash)}
            </div>
          )}

          {pollFailed && !expired && (
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#fef3c7',
                fontSize: 12,
                color: '#92400e',
              }}
            >
              Sin conexión con el servidor. Verificando cuando se restaure…
            </div>
          )}

          <p className="text-xs text-slate-500 break-all px-2">{payment.paymentId}</p>

          {expired && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#fef2f2',
                fontSize: 13,
                color: '#b91c1c',
              }}
            >
              El QR expiró. Generá un nuevo cobro.
            </div>
          )}

          {!hasTx && (
            <button className="btn-secondary w-full mt-2" onClick={reset}>
              {expired ? 'Nuevo cobro' : 'Cancelar y generar otro'}
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Cobrar (POS)" onBack={onBack} />

      <div className="form-section" style={{ paddingTop: 8 }}>
        <div className="manual-intro">
          <div className="manual-intro-title">Generá un QR de cobro</div>
          <div className="manual-intro-sub">
            merchant: {POS_MERCHANT_ID || '—'} · pos: {POS_POS_ID || '—'}
          </div>
        </div>

        <div className="field">
          <div className="field-label">Monto (MXN)</div>
          <div className="amount-input-wrap">
            <span className="amount-input-prefix">$</span>
            <input
              className="field-input amount-input"
              placeholder="0.00"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="amount-input-suffix">MXN</span>
          </div>
        </div>

        <div className="field">
          <div className="field-label">Referencia (opcional)</div>
          <input
            className="field-input"
            placeholder="Ej: TICKET-2045"
            maxLength={100}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{error}</div>
        )}

        <button
          className="btn-primary"
          style={{ marginTop: 18 }}
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Generando…' : 'Generar QR'}
        </button>
      </div>
    </>
  );
}

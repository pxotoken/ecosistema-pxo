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

export function Cobrar({ onBack, onConfirmed }: Props) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<GeneratePaymentResponse | null>(null);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async () => {
    const num = parseFloat(amount);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el cobro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!payment) return;
    const poll = async () => {
      try {
        const s = await getPaymentStatus(payment.paymentId);
        setStatus(s);
        setNow(Date.now());
      } catch {
        // silent — worker retries
      }
    };
    void poll();
    pollRef.current = setInterval(poll, 3_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [payment]);

  useEffect(() => {
    if (status?.status === 'CONFIRMED') {
      if (pollRef.current) clearInterval(pollRef.current);
      onConfirmed(
        '¡Cobro confirmado!',
        `Tx: ${status.txHash?.slice(0, 10) ?? ''}…`,
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
  };

  if (payment) {
    const remaining = new Date(payment.expiresAt).getTime() - now;
    const expired = status?.status === 'EXPIRED' || remaining <= 0;
    const statusLabel = status?.status ?? 'PENDING';

    return (
      <>
        <ScreenHeader title="Cobro generado" onBack={onBack} />

        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            Mostrá este QR al cliente para que pague
          </div>
          <img
            src={payment.qrData}
            alt="QR de cobro"
            style={{
              width: 260,
              height: 260,
              borderRadius: 12,
              background: '#fff',
              padding: 10,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          />
          <div style={{ marginTop: 14, fontSize: 28, fontWeight: 600 }}>
            ${payment.amountMXN.toFixed(2)} MXN
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}>
            Estado: <strong>{statusLabel}</strong> ·{' '}
            {expired ? 'Expirado' : `expira en ${formatMs(remaining)}`}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8', wordBreak: 'break-all' }}>
            paymentId: {payment.paymentId}
          </div>
        </div>

        <div className="cta-zone" style={{ padding: 16 }}>
          <button className="btn-secondary" onClick={reset}>
            Generar otro cobro
          </button>
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

        <button className="btn-primary" style={{ marginTop: 18 }} onClick={generate} disabled={loading}>
          {loading ? 'Generando…' : 'Generar QR'}
        </button>
      </div>
    </>
  );
}

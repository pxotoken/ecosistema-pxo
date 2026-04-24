import { useEffect, useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { getPaymentStatus, type PaymentStatusResponse } from '../lib/api';

interface Props {
  paymentId: string | null;
  onBack: () => void;
  onConfirm: (title: string, subtitle: string, amount: string) => void;
  onCancel: () => void;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PagarConfirm({ paymentId, onBack, onConfirm, onCancel }: Props) {
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const status = await getPaymentStatus(paymentId);
        if (!cancelled) setPayment(status);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    pollRef.current = setInterval(() => {
      setNow(Date.now());
      void load();
    }, 3_000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId]);

  useEffect(() => {
    if (payment?.status === 'CONFIRMED') {
      if (pollRef.current) clearInterval(pollRef.current);
      const amt = payment.amountMXN.toFixed(2);
      onConfirm('¡Pago confirmado!', `Tx: ${shortAddr(payment.txHash ?? '')}`, amt);
    }
  }, [payment?.status, onConfirm, payment]);

  if (!paymentId) {
    return (
      <>
        <ScreenHeader title="Confirmar pago" onBack={onBack} />
        <div className="form-section" style={{ padding: 18 }}>
          <div>Escaneá un QR primero.</div>
          <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 12 }}>
            Volver
          </button>
        </div>
      </>
    );
  }

  if (loading && !payment) {
    return (
      <>
        <ScreenHeader title="Confirmar pago" onBack={onBack} />
        <div className="form-section" style={{ padding: 18 }}>Cargando…</div>
      </>
    );
  }

  if (error && !payment) {
    return (
      <>
        <ScreenHeader title="Confirmar pago" onBack={onBack} />
        <div className="form-section" style={{ padding: 18 }}>
          <div style={{ color: '#b91c1c' }}>Error: {error}</div>
          <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 12 }}>
            Volver
          </button>
        </div>
      </>
    );
  }

  if (!payment) return null;

  const remaining = new Date(payment.expiresAt).getTime() - now;
  const expired = payment.status === 'EXPIRED' || remaining <= 0;

  return (
    <>
      <ScreenHeader title="Confirmar pago" onBack={onBack} />

      <div className="merchant-card">
        <div className="merchant-logo">{payment.merchantWallet.slice(2, 4).toUpperCase()}</div>
        <div className="merchant-name">Comercio</div>
        <div className="merchant-loc">{shortAddr(payment.merchantWallet)}</div>
        <div className="merchant-amount">
          <span className="currency">$</span>
          {Math.floor(payment.amountMXN)}
          <span className="cents">
            .{(payment.amountMXN % 1).toFixed(2).slice(2)}
          </span>
        </div>
        <div className="merchant-equiv">MXN · chain {payment.chainId}</div>
      </div>

      <div className="detail-list">
        <div className="detail-row">
          <div className="detail-key">Estado</div>
          <div className="detail-val">{payment.status}</div>
        </div>
        {payment.reference && (
          <div className="detail-row">
            <div className="detail-key">Referencia</div>
            <div className="detail-val">{payment.reference}</div>
          </div>
        )}
        <div className="detail-row">
          <div className="detail-key">Vence en</div>
          <div className="detail-val">{expired ? 'Expirado' : formatMs(remaining)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">amount PXO</div>
          <div className="detail-val">{payment.amountPXO}</div>
        </div>
      </div>

      <div className="cta-zone">
        {expired ? (
          <button className="btn-secondary" onClick={onCancel}>
            QR expirado — volver
          </button>
        ) : (
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#f5f7ff',
                color: '#334155',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              Firmá la transferencia desde tu wallet EVM (Thirdweb In-App, MetaMask,
              Trust Wallet) con el URI del QR. Cuando la tx se mine en chain{' '}
              {payment.chainId}, este panel se actualiza a{' '}
              <strong>CONFIRMED</strong> automáticamente.
            </div>
            <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 8 }}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </>
  );
}

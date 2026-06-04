import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parsePxoIntentUri } from '@pxo/shared/helpers';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  createChargeIntent,
  generatePayment,
  getPaymentStatus,
  type CreateChargeIntentResponse,
  type GeneratePaymentResponse,
  type PaymentStatusResponse,
} from '../lib/api';
import { POS_MERCHANT_ID, POS_POS_ID } from '../config/env';

interface Props {
  onBack: () => void;
  onConfirmed: (title: string, subtitle: string, amount: string) => void;
}

type Mode = 'idle' | 'push' | 'pull-scan' | 'pull-amount' | 'pull-wait';

const POLL_INTERVAL_MS = 3_000;
const MAX_ERRORS = 4;
const SCANNER_ELEMENT_ID = 'pxo-cobrar-scanner';

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

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function Cobrar({ onBack, onConfirmed }: Props) {
  const [mode, setMode] = useState<Mode>('idle');

  // ---- estado compartido / formulario ----
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pollErrorCount, setPollErrorCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- PUSH (legacy, genera QR para el cliente) ----
  const [payment, setPayment] = useState<GeneratePaymentResponse | null>(null);

  // ---- PULL (nuevo, escanea QR del cliente) ----
  const [scannedClientWallet, setScannedClientWallet] = useState<string | null>(null);
  const [charge, setCharge] = useState<CreateChargeIntentResponse | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Status compartido (la tabla payments es la misma para ambos flujos).
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setMode('idle');
    setPayment(null);
    setCharge(null);
    setStatus(null);
    setAmount('');
    setReference('');
    setError(null);
    setScannedClientWallet(null);
    setPollErrorCount(0);
  };

  // -------------------- PUSH --------------------
  const generatePushPayment = async () => {
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

  // -------------------- PULL: escaneo --------------------
  const stopScanner = async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (!instance) return;
    try {
      if (instance.isScanning) await instance.stop();
    } catch {
      // best effort
    }
    try {
      instance.clear();
    } catch {
      // best effort
    }
  };

  const startScanner = async () => {
    setError(null);
    setMode('pull-scan');
    await new Promise((r) => setTimeout(r, 0));
    try {
      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const parsed = parsePxoIntentUri(decoded);
          if (!parsed) return; // no es nuestro QR, seguir buscando
          setScannedClientWallet(parsed.wallet);
          void stopScanner().finally(() => setMode('pull-amount'));
        },
        () => {
          // Per-frame decode miss — ignorar.
        },
      );
    } catch (err) {
      await stopScanner();
      const msg = err instanceof Error ? err.message : String(err);
      if (/NotAllowed|Permission/i.test(msg)) {
        setError('Permiso de cámara denegado.');
      } else if (/NotFound|device/i.test(msg)) {
        setError('No se detectó cámara.');
      } else {
        setError(`No se pudo abrir la cámara: ${msg}`);
      }
      setMode('idle');
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  // -------------------- PULL: postear intent --------------------
  const submitPullIntent = async () => {
    if (!scannedClientWallet) return;
    const num = Number.parseFloat(amount);
    if (!num || num <= 0) {
      setError('Ingresá un monto en MXN.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createChargeIntent({
        clientWalletAddress: scannedClientWallet,
        amount: num,
        reference: reference || undefined,
      });
      setCharge(res);
      setStatus(null);
      setPollErrorCount(0);
      setMode('pull-wait');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      // 409: ya hay un PULL activo para este cliente
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- polling status (PUSH y PULL) --------------------
  useEffect(() => {
    const pendingId = payment?.paymentId ?? charge?.chargeId;
    if (!pendingId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const s = await getPaymentStatus(pendingId);
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
  }, [payment, charge]);

  useEffect(() => {
    if (status?.status === 'CONFIRMED') {
      if (pollRef.current) clearInterval(pollRef.current);
      const amtMXN =
        (payment?.amountMXN ?? charge?.amountMXN ?? status.amountMXN).toFixed(2);
      onConfirmed('¡Cobro confirmado!', `Tx: ${shortHash(status.txHash)}`, amtMXN);
    }
  }, [status, onConfirmed, payment, charge]);

  // -------------------- vistas --------------------

  // PUSH: QR generado, esperando pago del cliente
  if (mode === 'push' && payment) {
    const remaining = new Date(payment.expiresAt).getTime() - now;
    const expired = status?.status === 'EXPIRED' || remaining <= 0;
    const hasTx = !!status?.txHash;
    const pollFailed = pollErrorCount >= MAX_ERRORS;

    let badge = 'bg-slate-500/15 text-slate-400';
    let dot = 'bg-slate-400';
    let statusText = '';
    if (expired) {
      badge = 'bg-red-500/15 text-red-400';
      dot = 'bg-red-400';
      statusText = 'Expirado';
    } else if (hasTx) {
      badge = 'bg-blue-500/15 text-blue-400';
      dot = 'bg-blue-400 animate-pulse';
      statusText = 'Tx detectada — minando…';
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
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${badge}`}
          >
            <span className={`w-2 h-2 rounded-full ${dot}`} />
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
              Sin conexión con el servidor.
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
          <button className="btn-secondary w-full mt-2" onClick={reset}>
            {expired ? 'Nuevo cobro' : 'Cancelar y generar otro'}
          </button>
        </div>
      </>
    );
  }

  // PULL: esperando que el cliente firme
  if (mode === 'pull-wait' && charge) {
    const remaining = new Date(charge.expiresAt).getTime() - now;
    const expired = status?.status === 'EXPIRED' || remaining <= 0;
    const hasTx = !!status?.txHash;
    const pollFailed = pollErrorCount >= MAX_ERRORS;

    let badge = 'bg-amber-500/15 text-amber-500';
    let dot = 'bg-amber-400 animate-pulse';
    let statusText = `Esperando firma del cliente · ${formatMs(remaining)}`;
    if (expired) {
      badge = 'bg-red-500/15 text-red-400';
      dot = 'bg-red-400';
      statusText = 'Expirado';
    } else if (hasTx) {
      badge = 'bg-blue-500/15 text-blue-400';
      dot = 'bg-blue-400 animate-pulse';
      statusText = 'Firmada — minando…';
    }

    return (
      <>
        <ScreenHeader title="Cobro al cliente" onBack={onBack} />
        <div className="flex flex-col items-center gap-4 px-6 py-4 text-center overflow-y-auto flex-1">
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Le pediste a {shortAddr(charge.clientWallet)} que pague
          </div>
          <p className="text-3xl font-semibold">${charge.amountMXN.toFixed(2)} MXN</p>
          <p className="text-xs text-slate-500">
            {charge.amountPXO} unidades PXO · chain {charge.chainId}
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${badge}`}
          >
            <span className={`w-2 h-2 rounded-full ${dot}`} />
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
              Sin conexión con el servidor.
            </div>
          )}
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
              El cobro expiró. Pedile al cliente que vuelva a mostrar su QR.
            </div>
          )}
          <button className="btn-secondary w-full mt-2" onClick={reset}>
            {expired ? 'Nuevo cobro' : 'Cancelar y generar otro'}
          </button>
        </div>
      </>
    );
  }

  // PULL: input de monto después de escanear QR del cliente
  if (mode === 'pull-amount' && scannedClientWallet) {
    return (
      <>
        <ScreenHeader title="Monto a cobrar" onBack={reset} />
        <div className="form-section" style={{ paddingTop: 8 }}>
          <div className="manual-intro">
            <div className="manual-intro-title">Cliente {shortAddr(scannedClientWallet)}</div>
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
            onClick={() => void submitPullIntent()}
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Cobrar'}
          </button>
        </div>
      </>
    );
  }

  // PULL: escaneando
  if (mode === 'pull-scan') {
    return (
      <>
        <ScreenHeader title="Escanear QR cliente" onBack={() => void stopScanner().finally(() => setMode('idle'))} />
        <div className="form-section" style={{ paddingTop: 8 }}>
          <div
            id={SCANNER_ELEMENT_ID}
            style={{
              width: '100%',
              minHeight: 280,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#000',
            }}
          />
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
            Apuntá al QR del cliente (formato pxo://).
          </div>
          {error && (
            <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{error}</div>
          )}
          <button
            className="btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => void stopScanner().finally(() => setMode('idle'))}
          >
            Cancelar
          </button>
        </div>
      </>
    );
  }

  // PUSH: form de monto
  if (mode === 'push') {
    return (
      <>
        <ScreenHeader title="Generar QR cobro" onBack={() => setMode('idle')} />
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
            onClick={() => void generatePushPayment()}
            disabled={loading}
          >
            {loading ? 'Generando…' : 'Generar QR'}
          </button>
        </div>
      </>
    );
  }

  // idle: selector de modo
  return (
    <>
      <ScreenHeader title="Cobrar (POS)" onBack={onBack} />
      <div className="form-section" style={{ paddingTop: 8, gap: 12, display: 'flex', flexDirection: 'column' }}>
        <div className="manual-intro">
          <div className="manual-intro-title">¿Cómo querés cobrar?</div>
          <div className="manual-intro-sub">
            merchant: {POS_MERCHANT_ID || '—'} · pos: {POS_POS_ID || '—'}
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => void startScanner()}
        >
          Escanear QR del cliente
        </button>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: -4 }}>
          El cliente confirma desde su app antes de pagar.
        </div>

        <div
          style={{
            margin: '8px 0',
            fontSize: 11,
            color: '#94a3b8',
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          — O —
        </div>

        <button className="btn-secondary" onClick={() => setMode('push')}>
          Generar QR para que el cliente escanee
        </button>
      </div>
    </>
  );
}

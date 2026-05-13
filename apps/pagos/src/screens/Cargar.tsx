import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenId } from '../types';

interface Props {
  onBack: () => void;
  onNavigate: (id: ScreenId) => void;
}

type Tab = 'qr' | 'man';

const SCANNER_ELEMENT_ID = 'pxo-card-scanner';

function formatCardCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join('-') : '';
}

export function Cargar({ onBack, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('qr');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const goConfirm = () => onNavigate('cargar-confirm');

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
    setScanning(true);
    await new Promise((r) => setTimeout(r, 0));
    try {
      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        () => {
          // Any decoded text is accepted for now — the card payload schema is
          // not defined yet. On detect, close the scanner and hand off to the
          // confirmation screen.
          void stopScanner().finally(() => {
            setScanning(false);
            goConfirm();
          });
        },
        () => {
          // Per-frame decode miss — ignore.
        },
      );
    } catch (err) {
      await stopScanner();
      setScanning(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (/NotAllowed|Permission/i.test(msg)) {
        setError('Permiso de cámara denegado. Habilitalo en el navegador y reintentá.');
      } else if (/NotFound|device/i.test(msg)) {
        setError('No se detectó cámara en este dispositivo.');
      } else {
        setError(`No se pudo abrir la cámara: ${msg}`);
      }
    }
  };

  const cancelScan = () => {
    void stopScanner().finally(() => setScanning(false));
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <>
      <ScreenHeader title="Fondear wallet" onBack={onBack} />

      <div className="tab-switch">
        <div className={`tab-opt${tab === 'qr' ? ' on' : ''}`} onClick={() => setTab('qr')}>
          Escanear QR
        </div>
        <div className={`tab-opt${tab === 'man' ? ' on' : ''}`} onClick={() => setTab('man')}>
          Código manual
        </div>
      </div>

      {tab === 'qr' ? (
        scanning ? (
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
              Apuntá al QR de tu tarjeta.
            </div>
            {error && (
              <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{error}</div>
            )}
            <button className="btn-secondary" style={{ marginTop: 10 }} onClick={cancelScan}>
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <div className="scanner-zone" style={{ height: 340 }} onClick={startScanner}>
              <div className="scanner-bg" />
              <div className="scanner-frame">
                <div className="corner-bl" />
                <div className="corner-br" />
                <div className="scanner-line" />
              </div>
              <div className="scanner-tap-hint">Tocá para escanear</div>
              <div className="scanner-hint">Apuntá al QR de tu tarjeta</div>
            </div>

            <div className="scanner-cta">
              Escaneá el código QR de tu tarjeta
              <br />
              de prepago para acreditar el saldo.
            </div>

            {error && (
              <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6, padding: '0 18px' }}>
                {error}
              </div>
            )}
          </>
        )
      ) : (
        <div className="form-section" style={{ paddingTop: 8 }}>
          <div className="field">
            <div className="field-label">Código de tarjeta</div>
            <input
              className="field-input"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={19}
              value={code}
              onChange={(e) => setCode(formatCardCode(e.target.value))}
            />
          </div>
          <div className="field">
            <div className="field-label">PIN de seguridad</div>
            <input
              className="field-input"
              placeholder="••••"
              maxLength={4}
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <button className="btn-primary" onClick={goConfirm} style={{ marginTop: 8 }}>
            Validar y cargar
          </button>
        </div>
      )}
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenId } from '../types';
import { parseEIP681Uri } from '../lib/eip681';

interface Props {
  onBack: () => void;
  onNavigate: (id: ScreenId) => void;
  onScanned: (paymentId: string) => void;
}

const SCANNER_ELEMENT_ID = 'pxo-qr-scanner';

export function Pagar({ onBack, onNavigate, onScanned }: Props) {
  const [uri, setUri] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleParse = (candidate: string) => {
    const parsed = parseEIP681Uri(candidate);
    if (!parsed) {
      setError('No es un QR EIP-681 válido.');
      return false;
    }
    if (!parsed.paymentId) {
      setError('El QR no contiene un paymentId.');
      return false;
    }
    setError(null);
    onScanned(parsed.paymentId);
    return true;
  };

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
    // Wait one tick so the container exists in the DOM.
    await new Promise((r) => setTimeout(r, 0));
    try {
      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const ok = handleParse(decodedText);
          if (ok) {
            void stopScanner().finally(() => setScanning(false));
          }
        },
        () => {
          // Per-frame decode miss — noisy, ignore.
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
      <ScreenHeader title="Pagar con QR" onBack={onBack} />

      {scanning ? (
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
            Apuntá al QR generado por el comercio.
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
          <div className="scanner-zone" onClick={startScanner}>
            <div className="scanner-bg" />
            <div className="scanner-frame">
              <div className="corner-bl" />
              <div className="corner-br" />
              <div className="scanner-line" />
            </div>
            <div className="scanner-tap-hint">Tocá para escanear</div>
            <div className="scanner-hint">Apuntá al QR del comercio</div>
          </div>

          <div className="scanner-cta">
            Pagá en cualquier comercio adherido escaneando con la cámara o pegando
            el URI abajo.
          </div>

          <div className="form-section" style={{ paddingTop: 4 }}>
            <div className="field">
              <div className="field-label">URI del QR (EIP-681)</div>
              <textarea
                className="field-input"
                rows={3}
                placeholder="ethereum:0x…@80002/transfer?…"
                value={uri}
                onChange={(e) => {
                  setUri(e.target.value);
                  setError(null);
                }}
              />
              {error && (
                <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{error}</div>
              )}
            </div>

            <button className="btn-primary" onClick={() => handleParse(uri)}>
              Continuar
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('pagar-manual')}>
              Ingresar código manualmente
            </button>
          </div>
        </>
      )}
    </>
  );
}

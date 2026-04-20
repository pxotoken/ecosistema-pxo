import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenId } from '../types';

interface Props {
  onBack: () => void;
  onNavigate: (id: ScreenId) => void;
}

type Tab = 'qr' | 'man';

function formatCardCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join('-') : '';
}

export function Cargar({ onBack, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('qr');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');

  const goConfirm = () => onNavigate('cargar-confirm');

  return (
    <>
      <ScreenHeader title="Cargar wallet" onBack={onBack} />

      <div className="tab-switch">
        <div className={`tab-opt${tab === 'qr' ? ' on' : ''}`} onClick={() => setTab('qr')}>
          Escanear QR
        </div>
        <div className={`tab-opt${tab === 'man' ? ' on' : ''}`} onClick={() => setTab('man')}>
          Código manual
        </div>
      </div>

      {tab === 'qr' ? (
        <>
          <div className="scanner-zone" style={{ height: 340 }} onClick={goConfirm}>
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
        </>
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

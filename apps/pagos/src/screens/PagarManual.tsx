import { useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenId } from '../types';

interface Props {
  onBack: () => void;
  onNavigate: (id: ScreenId) => void;
  onSuccess: (title: string, subtitle: string, amount: string) => void;
}

function formatCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

export function PagarManual({ onBack, onNavigate, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');

  const codeRef = useRef<HTMLInputElement | null>(null);
  const amtRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    const bareCode = code.replace(/\s/g, '');
    if (bareCode.length < 8) {
      codeRef.current?.focus();
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      amtRef.current?.focus();
      return;
    }
    const display = amount.includes('.') ? amount : `${amount}.00`;
    const safeConcept = concept || 'Pago al comercio';
    onSuccess('¡Pago realizado!', `${safeConcept} · Comercio #${bareCode}`, display);
  };

  return (
    <>
      <ScreenHeader title="Código de pago" onBack={onBack} />

      <div className="form-section" style={{ paddingTop: 8 }}>
        <div className="manual-intro">
          <div className="manual-intro-title">Pagá ingresando el código</div>
          <div className="manual-intro-sub">
            Pedile al comercio el código de cobro de 8 dígitos que aparece debajo de su QR.
          </div>
        </div>

        <div className="field">
          <div className="field-label">Código del comercio</div>
          <input
            ref={codeRef}
            className="field-input field-mono"
            placeholder="00000000"
            maxLength={9}
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value))}
          />
        </div>

        <div className="field">
          <div className="field-label">Monto a pagar</div>
          <div className="amount-input-wrap">
            <span className="amount-input-prefix">$</span>
            <input
              ref={amtRef}
              className="field-input amount-input"
              placeholder="0.00"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="amount-input-suffix">PXO</span>
          </div>
        </div>

        <div className="field">
          <div className="field-label">Concepto (opcional)</div>
          <input
            className="field-input"
            placeholder="Ej: Almuerzo, café…"
            maxLength={40}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
        </div>

        <button className="btn-primary" style={{ marginTop: 18 }} onClick={submit}>
          Continuar al pago
        </button>
        <button className="btn-secondary" onClick={() => onNavigate('pagar')}>
          Volver al escáner
        </button>
      </div>
    </>
  );
}

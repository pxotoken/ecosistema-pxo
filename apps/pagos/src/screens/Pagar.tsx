import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenId } from '../types';

interface Props {
  onBack: () => void;
  onNavigate: (id: ScreenId) => void;
}

export function Pagar({ onBack, onNavigate }: Props) {
  return (
    <>
      <ScreenHeader title="Pagar con QR" onBack={onBack} />

      <div className="scanner-zone" onClick={() => onNavigate('pagar-confirm')}>
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
        Pagá en cualquier comercio adherido
        <br />
        simplemente escaneando su código.
      </div>

      <div className="manual-link" onClick={() => onNavigate('pagar-manual')}>
        Ingresar código manualmente
      </div>
    </>
  );
}

import { ScreenHeader } from '../components/ScreenHeader';
import { merchantPreview } from '../data/mockData';

interface Props {
  onBack: () => void;
  onConfirm: (title: string, subtitle: string, amount: string) => void;
  onCancel: () => void;
}

export function PagarConfirm({ onBack, onConfirm, onCancel }: Props) {
  const amountDisplay = `${merchantPreview.whole}${merchantPreview.cents}`;

  return (
    <>
      <ScreenHeader title="Confirmar pago" onBack={onBack} />

      <div className="merchant-card">
        <div className="merchant-logo">{merchantPreview.initials}</div>
        <div className="merchant-name">{merchantPreview.name}</div>
        <div className="merchant-loc">{merchantPreview.location}</div>
        <div className="merchant-amount">
          <span className="currency">$</span>
          {merchantPreview.whole}
          <span className="cents">{merchantPreview.cents}</span>
        </div>
        <div className="merchant-equiv">≈ {amountDisplay} MXN · Sin comisiones</div>
      </div>

      <div className="detail-list">
        <div className="detail-row">
          <div className="detail-key">Pagás con</div>
          <div className="detail-val">PXO Wallet</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">Tipo de cambio</div>
          <div className="detail-val">{merchantPreview.rate}</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">Comisión</div>
          <div className="detail-val accent">$0.00</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">Llega al comercio</div>
          <div className="detail-val">Al instante</div>
        </div>
      </div>

      <div className="cta-zone">
        <button
          className="btn-primary"
          onClick={() =>
            onConfirm(
              '¡Pago realizado!',
              `Tu pago a ${merchantPreview.name} fue confirmado.`,
              amountDisplay,
            )
          }
        >
          Confirmar pago
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </>
  );
}

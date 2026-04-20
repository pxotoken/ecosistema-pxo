import { ScreenHeader } from '../components/ScreenHeader';
import { cardPreview } from '../data/mockData';

interface Props {
  onBack: () => void;
  onConfirm: (title: string, subtitle: string, amount: string) => void;
}

export function CargarConfirm({ onBack, onConfirm }: Props) {
  const amountDisplay = `${cardPreview.whole}${cardPreview.cents}`;
  const amountMxn = `$${amountDisplay} MXN`;

  return (
    <>
      <ScreenHeader title="Tarjeta detectada" onBack={onBack} />

      <div className="card-preview">
        <div className="card-brand">
          PXO <span>·</span> Tarjeta de carga
        </div>
        <div className="card-amount">
          <span className="currency">$</span>
          {cardPreview.whole}
          <span className="cents">{cardPreview.cents}</span>
        </div>
        <div className="card-num">{cardPreview.number}</div>
        <div className="card-foot">
          <div className="card-chip" />
        </div>
      </div>

      <div className="detail-list" style={{ marginTop: 24 }}>
        <div className="detail-row">
          <div className="detail-key">Valor de la tarjeta</div>
          <div className="detail-val">{amountMxn}</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">Vas a recibir</div>
          <div className="detail-val accent">{amountDisplay} PXO</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">Comisión</div>
          <div className="detail-val accent">$0.00</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">Punto de venta</div>
          <div className="detail-val">{cardPreview.pos}</div>
        </div>
      </div>

      <div className="cta-zone">
        <button
          className="btn-primary"
          onClick={() =>
            onConfirm(
              '¡Wallet cargada!',
              `Se acreditaron ${cardPreview.whole} PXO en tu wallet.`,
              amountDisplay,
            )
          }
        >
          Acreditar saldo
        </button>
      </div>
    </>
  );
}

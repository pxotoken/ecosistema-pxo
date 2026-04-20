import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { QrPattern } from '../components/QrPattern';
import { CopyIcon, ShareIcon } from '../components/icons';
import { profile } from '../data/mockData';

interface Props {
  onBack: () => void;
  onToast: (msg: string) => void;
}

export function Recibir({ onBack, onToast }: Props) {
  const [copied, setCopied] = useState(false);
  const [walletDisplay, setWalletDisplay] = useState(profile.walletShort);

  const copyWallet = () => {
    if (!profile.walletFull) return;
    if (navigator.clipboard) navigator.clipboard.writeText(profile.walletFull).catch(() => {});
    setWalletDisplay(`${profile.walletFull.slice(0, 10)}...${profile.walletFull.slice(-6)}`);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setWalletDisplay(profile.walletShort);
    }, 2000);
  };

  const copyAlias = () => {
    if (!profile.alias) return;
    if (navigator.clipboard) navigator.clipboard.writeText(profile.alias).catch(() => {});
    onToast(`Alias copiado: ${profile.alias}`);
  };

  const missingProfile = !profile.alias;

  return (
    <>
      <ScreenHeader title="Recibir dinero" onBack={onBack} />

      <div className="qr-zone">
        <div className="qr-card">
          <QrPattern />
          <div className="qr-center-logo">
            <div className="qr-logo-text">P</div>
          </div>
        </div>

        <div className="qr-name">{profile.name || 'Tu wallet'}</div>
        <div className="qr-amt">Te enviarán dinero a tu wallet</div>

        <div className="wallet-id-card">
          <div>
            <div className="wallet-id-label">Dirección de tu wallet</div>
            <div className="wallet-id-value">{walletDisplay || '—'}</div>
          </div>
          <button
            className={`wallet-id-copy${copied ? ' copied' : ''}`}
            onClick={copyWallet}
            disabled={missingProfile}
          >
            <CopyIcon />
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <div className="wallet-alias-row">
          <span className="wallet-alias-tag">alias</span>
          <span className="wallet-alias-value">{profile.alias || 'sin-alias.pxo'}</span>
        </div>
      </div>

      <div className="qr-actions">
        <div className="qr-action" onClick={copyAlias}>
          <CopyIcon width={20} height={20} />
          <div>Copiar alias</div>
        </div>
        <div className="qr-action" onClick={() => onToast('Compartido (demo)')}>
          <ShareIcon />
          <div>Compartir</div>
        </div>
      </div>
    </>
  );
}

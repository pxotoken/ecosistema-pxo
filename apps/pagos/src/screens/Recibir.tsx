import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ScreenHeader } from '../components/ScreenHeader';
import { CopyIcon, ShareIcon } from '../components/icons';
import { useAuthContext } from '../contexts/AuthContext';
import { PAYMENTS_CHAIN_ID, getPxoTokenAddress } from '../config/env';

interface Props {
  onBack: () => void;
  onToast: (msg: string) => void;
}

function shortAddr(addr: string): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

/**
 * Build an EIP-681 receive URI. No amount — the payer fills it in from the
 * wallet side. Wallets compatible: MetaMask, Trust, Rainbow, Thirdweb In-App.
 */
function buildReceiveUri(walletAddress: string): string | null {
  const tokenAddress = getPxoTokenAddress();
  if (!tokenAddress || !walletAddress) return null;
  return `ethereum:${tokenAddress}@${PAYMENTS_CHAIN_ID}/transfer?address=${walletAddress}`;
}

export function Recibir({ onBack, onToast }: Props) {
  const { account, user } = useAuthContext();
  const walletAddress = account?.address ?? '';
  const mail = user?.mail ?? '';

  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const uri = buildReceiveUri(walletAddress);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setQrDataUrl(null);
      setQrError(
        walletAddress ? 'No hay dirección de token PXO configurada para esta red.' : null,
      );
      return;
    }
    QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 320,
      type: 'image/png',
    })
      .then((data) => {
        if (!cancelled) {
          setQrDataUrl(data);
          setQrError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setQrError(err instanceof Error ? err.message : 'No se pudo generar el QR');
      });
    return () => {
      cancelled = true;
    };
  }, [uri, walletAddress]);

  const copyWallet = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
    } catch {
      // fallback silencioso
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyUri = async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
    } catch {
      // ignore
    }
    onToast('URI copiado');
  };

  return (
    <>
      <ScreenHeader title="Recibir dinero" onBack={onBack} />

      <div className="qr-zone">
        <div className="qr-card" style={{ background: '#fff', padding: 12 }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR de tu wallet"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                display: 'grid',
                placeItems: 'center',
                color: '#94a3b8',
                fontSize: 13,
                textAlign: 'center',
                padding: 16,
              }}
            >
              {qrError ?? 'Generando QR…'}
            </div>
          )}
        </div>

        <div className="qr-name">{mail || 'Tu wallet'}</div>
        <div className="qr-amt">Escaneá con una wallet compatible para enviarte PXO</div>

        <div className="wallet-id-card">
          <div>
            <div className="wallet-id-label">Dirección de tu wallet</div>
            <div className="wallet-id-value">
              {walletAddress ? shortAddr(walletAddress) : '—'}
            </div>
          </div>
          <button
            className={`wallet-id-copy${copied ? ' copied' : ''}`}
            onClick={copyWallet}
            disabled={!walletAddress}
          >
            <CopyIcon />
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <div className="wallet-alias-row">
          <span className="wallet-alias-tag">red</span>
          <span className="wallet-alias-value">chainId {PAYMENTS_CHAIN_ID}</span>
        </div>
      </div>

      <div className="qr-actions">
        <div className="qr-action" onClick={copyUri}>
          <CopyIcon width={20} height={20} />
          <div>Copiar URI</div>
        </div>
        <div className="qr-action" onClick={() => onToast('Compartido (demo)')}>
          <ShareIcon />
          <div>Compartir</div>
        </div>
      </div>
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useSwitchActiveWalletChain } from 'thirdweb/react';
import { getContract, getGasPrice } from 'thirdweb';
import { transfer } from 'thirdweb/extensions/erc20';
import { sendTransaction } from 'thirdweb/transaction';
import { formatUnits } from 'viem';
import type { Chain } from 'thirdweb';
import { buildPxoIntentUri } from '@pxo/shared/helpers';
import { ScreenHeader } from '../components/ScreenHeader';
import { CopyIcon } from '../components/icons';
import { useAuthContext } from '../contexts/AuthContext';
import {
  getChainForId,
  getPxoTokenAddress,
  PAYMENTS_CHAIN_ID,
  PXO_DECIMALS,
} from '../config/env';
import { getThirdwebClient } from '../lib/thirdweb-client';
import {
  getPendingCharge,
  reportPaymentTx,
  type PendingChargeResponse,
} from '../lib/api';
import {
  SignatureTimeoutError,
  sendTransactionWithSignatureDeadline,
} from '../lib/signatureTransaction';
import { isEmbeddedThirdwebWallet } from '../lib/walletSigning';
import { toChecksumAddress } from '../lib/evmAddress';
import type { ScreenId } from '../types';

interface Props {
  onBack: () => void;
  onConfirmed: (title: string, subtitle: string, amount: string) => void;
  onNavigate: (id: ScreenId) => void;
}

const POLL_INTERVAL_MS = 2_500;
const MIN_GAS_PRICE = BigInt(25_000_000_000);
const FALLBACK_GAS_TESTNET = BigInt(30_000_000_000);
const FALLBACK_GAS_MAINNET = BigInt(20_000_000_000);

function shortAddr(addr: string): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function resolveGasPrice(
  client: NonNullable<ReturnType<typeof getThirdwebClient>>,
  chain: Chain,
): Promise<bigint> {
  try {
    const price = await getGasPrice({ client, chain });
    if (price < MIN_GAS_PRICE) {
      return chain.id === 80002 ? FALLBACK_GAS_TESTNET : FALLBACK_GAS_MAINNET;
    }
    return price;
  } catch {
    return chain.id === 80002 ? FALLBACK_GAS_TESTNET : FALLBACK_GAS_MAINNET;
  }
}

export function Pagar({ onBack, onConfirmed, onNavigate }: Props) {
  const { account, wallet } = useAuthContext();
  const switchChain = useSwitchActiveWalletChain();

  const walletAddress = account?.address ?? '';
  const intentUri = useMemo(
    () => (walletAddress ? buildPxoIntentUri({ wallet: walletAddress }) : null),
    [walletAddress],
  );

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [charge, setCharge] = useState<PendingChargeResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [dismissedChargeId, setDismissedChargeId] = useState<string | null>(null);

  // Render QR del wallet del cliente.
  useEffect(() => {
    let cancelled = false;
    if (!intentUri) {
      setQrDataUrl(null);
      setQrError(walletAddress ? null : 'Conectá tu wallet para mostrar el QR.');
      return;
    }
    QRCode.toDataURL(intentUri, {
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
        if (!cancelled) {
          setQrError(err instanceof Error ? err.message : 'No se pudo generar el QR');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [intentUri, walletAddress]);

  // Polling al backend buscando un PULL pendiente para esta wallet.
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const pending = await getPendingCharge(walletAddress);
        if (cancelled) return;
        setNow(Date.now());
        if (!pending) {
          setCharge(null);
          return;
        }
        // Si el usuario ya rechazó este charge, no lo volvemos a mostrar.
        if (pending.chargeId === dismissedChargeId) return;
        setCharge(pending);
      } catch {
        // Silencioso. El propio polling reintenta.
      }
    };

    void tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    const ticker = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(ticker);
    };
  }, [walletAddress, dismissedChargeId]);

  const handleConfirm = useCallback(async () => {
    if (!charge) return;
    if (charge.chainId !== PAYMENTS_CHAIN_ID) {
      setPayError(`Charge en chain ${charge.chainId} pero la app está en ${PAYMENTS_CHAIN_ID}.`);
      return;
    }
    const client = getThirdwebClient();
    if (!client || !account || !wallet) {
      setPayError('Conectá tu wallet para confirmar.');
      return;
    }
    const targetChain = getChainForId(charge.chainId);
    if (!targetChain) {
      setPayError('Red no soportada.');
      return;
    }
    const tokenAddress = getPxoTokenAddress(charge.chainId);
    if (!tokenAddress) {
      setPayError('Token PXO no configurado para esta red.');
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      await switchChain(targetChain);
      const gasPrice = await resolveGasPrice(client, targetChain);
      const humanAmount = Number.parseFloat(formatUnits(BigInt(charge.amountPXO), PXO_DECIMALS));
      if (!Number.isFinite(humanAmount) || humanAmount <= 0) {
        throw new Error('Monto inválido');
      }

      const contract = getContract({
        address: toChecksumAddress(tokenAddress),
        client,
        chain: targetChain,
      });

      const tx = transfer({
        amount: humanAmount,
        contract,
        to: toChecksumAddress(charge.merchantWallet),
        overrides: { gasPrice },
      });

      const sendOnce = () => sendTransaction({ transaction: tx, account });
      const receipt = isEmbeddedThirdwebWallet(wallet)
        ? await sendOnce()
        : await sendTransactionWithSignatureDeadline({ send: sendOnce });

      const txHash = receipt.transactionHash;
      // Best-effort: el matching on-chain del backend lo detectará igual vía webhook,
      // pero reportar el tx hash acelera la conciliación.
      reportPaymentTx(charge.chargeId, txHash, account.address).catch(() => {});

      onConfirmed(
        '¡Pago enviado!',
        `Esperando confirmación en red. Tx: ${txHash.slice(0, 8)}…`,
        charge.amountMXN.toFixed(2),
      );
      setCharge(null);
    } catch (e) {
      if (e instanceof SignatureTimeoutError) {
        setPayError('Tiempo de firma agotado. Reintentá o revisá el explorador.');
      } else {
        const msg = e instanceof Error ? e.message : 'No se pudo enviar el pago';
        if (/user rejected|denied|closed/i.test(msg)) {
          setPayError('Transacción cancelada.');
        } else {
          setPayError(msg);
        }
      }
    } finally {
      setPaying(false);
    }
  }, [charge, account, wallet, switchChain, onConfirmed]);

  const handleReject = useCallback(() => {
    if (charge) setDismissedChargeId(charge.chargeId);
    setCharge(null);
    setPayError(null);
  }, [charge]);

  const copyUri = useCallback(async () => {
    if (!intentUri) return;
    try {
      await navigator.clipboard.writeText(intentUri);
    } catch {
      // ignore
    }
  }, [intentUri]);

  const expiresIn = charge ? new Date(charge.expiresAt).getTime() - now : 0;
  const chargeExpired = !!charge && expiresIn <= 0;

  return (
    <>
      <ScreenHeader title="Pagar" onBack={onBack} />

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

        <div className="qr-name">Mostrale este QR al comercio</div>
        <div className="qr-amt">
          El comercio lo escanea, define el monto y vos confirmás antes de pagar.
        </div>

        <div className="wallet-id-card">
          <div>
            <div className="wallet-id-label">Tu wallet</div>
            <div className="wallet-id-value">
              {walletAddress ? shortAddr(walletAddress) : '—'}
            </div>
          </div>
          <button className="wallet-id-copy" onClick={copyUri} disabled={!intentUri}>
            <CopyIcon />
            <span>Copiar URI</span>
          </button>
        </div>

        <div className="wallet-alias-row">
          <span className="wallet-alias-tag">red</span>
          <span className="wallet-alias-value">chainId {PAYMENTS_CHAIN_ID}</span>
        </div>

        <button
          className="btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => onNavigate('escanear')}
        >
          ¿Tenés QR del comercio? Escanear
        </button>
      </div>

      {charge && !chargeExpired && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '24px 20px 28px',
              width: '100%',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {charge.merchantName ? charge.merchantName : `Comercio ${shortAddr(charge.merchantWallet)}`}
              </div>
              <div style={{ fontSize: 14, color: '#475569', marginTop: 6 }}>te quiere cobrar</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>
                ${charge.amountMXN.toFixed(2)}{' '}
                <span style={{ fontSize: 14, color: '#64748b' }}>MXN</span>
              </div>
              {charge.reference && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Ref: {charge.reference}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
                Expira en {formatMs(expiresIn)} · chain {charge.chainId}
              </div>
            </div>

            {payError && (
              <div
                style={{
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {payError}
              </div>
            )}

            <button
              className="btn-primary"
              onClick={() => void handleConfirm()}
              disabled={paying}
              style={{ width: '100%' }}
            >
              {paying ? 'Firmando…' : `Confirmar y pagar $${charge.amountMXN.toFixed(2)}`}
            </button>
            <button
              className="btn-secondary"
              onClick={handleReject}
              disabled={paying}
              style={{ width: '100%', marginTop: 8 }}
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {charge && chargeExpired && (
        <div
          role="alert"
          style={{
            margin: '12px 16px',
            padding: '10px 14px',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: 8,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          El cobro expiró. Pedile al comercio que vuelva a escanear.
        </div>
      )}
    </>
  );
}

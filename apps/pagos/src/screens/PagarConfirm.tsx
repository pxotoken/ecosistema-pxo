import { useCallback, useEffect, useRef, useState } from 'react';
import { useSwitchActiveWalletChain } from 'thirdweb/react';
import { getGasPrice } from 'thirdweb';
import { getContract } from 'thirdweb/contract';
import { transfer } from 'thirdweb/extensions/erc20';
import { sendTransaction } from 'thirdweb/transaction';
import { formatUnits } from 'viem';
import type { Chain } from 'thirdweb';

import { ScreenHeader } from '../components/ScreenHeader';
import { useAuthContext } from '../contexts/AuthContext';
import { getChainForId, getPxoTokenAddress, PXO_DECIMALS } from '../config/env';
import { getThirdwebClient } from '../lib/thirdweb-client';
import { getPaymentStatus, reportPaymentTx, type PaymentStatusResponse } from '../lib/api';
import {
  SignatureTimeoutError,
  sendTransactionWithSignatureDeadline,
} from '../lib/signatureTransaction';
import { isEmbeddedThirdwebWallet } from '../lib/walletSigning';
import { toChecksumAddress } from '../lib/evmAddress';

interface Props {
  paymentId: string | null;
  onBack: () => void;
  onConfirm: (title: string, subtitle: string, amount: string) => void;
  onCancel: () => void;
  onGoHome: () => void;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MIN_GAS_PRICE = BigInt(25000000000);
const FALLBACK_GAS_TESTNET = BigInt(30000000000);
const FALLBACK_GAS_MAINNET = BigInt(20000000000);

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

export function PagarConfirm({ paymentId, onBack, onConfirm, onCancel, onGoHome }: Props) {
  const { wallet, account } = useAuthContext();
  const switchChain = useSwitchActiveWalletChain();

  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [sentTxHash, setSentTxHash] = useState<string | null>(null);
  const [txConfirmed, setTxConfirmed] = useState(false);
  const [pollError, setPollError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const status = await getPaymentStatus(paymentId);
        if (!cancelled) {
          setPayment(status);
          setPollError(false);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    pollRef.current = setInterval(() => {
      setNow(Date.now());
      getPaymentStatus(paymentId)
        .then((s) => {
          if (!cancelled) {
            setPayment(s);
            setPollError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setPollError(true);
        });
    }, 3_000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId]);

  useEffect(() => {
    if (payment?.status === 'CONFIRMED') {
      if (pollRef.current) clearInterval(pollRef.current);
      if (sentRef.current) {
        setTxConfirmed(true);
      } else {
        const amt = payment.amountMXN.toFixed(2);
        onConfirm('¡Pago confirmado!', `Tx: ${shortAddr(payment.txHash ?? '')}`, amt);
      }
    }
  }, [payment?.status, onConfirm, payment]);

  const handlePay = useCallback(async () => {
    if (!payment || payment.status !== 'PENDING') return;
    const expired = new Date(payment.expiresAt).getTime() <= Date.now();
    if (expired) return;

    setPayError(null);
    const client = getThirdwebClient();
    if (!client || !account || !wallet) {
      setPayError('Conectá tu wallet para pagar.');
      return;
    }

    const targetChain = getChainForId(payment.chainId);
    if (!targetChain) {
      setPayError('Red no soportada para este pago.');
      return;
    }

    const tokenAddress = getPxoTokenAddress(payment.chainId);
    if (!tokenAddress) {
      setPayError('Token PXO no configurado para esta red.');
      return;
    }

    setPaying(true);
    try {
      await switchChain(targetChain);
      const gasPrice = await resolveGasPrice(client, targetChain);
      const humanAmount = Number.parseFloat(
        formatUnits(BigInt(payment.amountPXO), PXO_DECIMALS),
      );
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
        to: toChecksumAddress(payment.merchantWallet),
        overrides: { gasPrice },
      });

      const sendOnce = () => sendTransaction({ transaction: tx, account });

      let receipt: Awaited<ReturnType<typeof sendOnce>>;
      if (isEmbeddedThirdwebWallet(wallet)) {
        receipt = await sendOnce();
      } else {
        receipt = await sendTransactionWithSignatureDeadline({ send: sendOnce });
      }

      const txHash = receipt.transactionHash;
      sentRef.current = true;
      setSentTxHash(txHash);

      reportPaymentTx(payment.paymentId, txHash, account.address).catch(() => {});
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
  }, [payment, account, wallet, switchChain]);

  if (!paymentId) {
    return (
      <>
        <ScreenHeader title="Confirmar pago" onBack={onBack} />
        <div className="form-section" style={{ padding: 18 }}>
          <div>Escaneá un QR primero.</div>
          <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 12 }}>
            Volver
          </button>
        </div>
      </>
    );
  }

  if (loading && !payment) {
    return (
      <>
        <ScreenHeader title="Confirmar pago" onBack={onBack} />
        <div className="form-section" style={{ padding: 18 }}>Cargando…</div>
      </>
    );
  }

  if (error && !payment) {
    return (
      <>
        <ScreenHeader title="Confirmar pago" onBack={onBack} />
        <div className="form-section" style={{ padding: 18 }}>
          <div style={{ color: '#b91c1c' }}>Error: {error}</div>
          <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 12 }}>
            Volver
          </button>
        </div>
      </>
    );
  }

  if (!payment) return null;

  if (sentTxHash) {
    const isConfirmed = txConfirmed || payment.status === 'CONFIRMED';

    const handleGoHome = () => {
      if (isConfirmed) {
        onConfirm(
          '¡Pago confirmado!',
          `Tx: ${shortAddr(payment.txHash ?? sentTxHash)}`,
          payment.amountMXN.toFixed(2),
        );
      } else {
        onGoHome();
      }
    };

    return (
      <>
        <ScreenHeader title={isConfirmed ? '¡Pago confirmado!' : 'Pago en proceso'} onBack={() => {}} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 24px 24px',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: isConfirmed ? '#dcfce7' : '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            {isConfirmed ? '✓' : '⏳'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            {isConfirmed
              ? 'Tu pago fue confirmado'
              : 'Tu transacción está en proceso'}
          </div>
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
            {isConfirmed ? (
              <>
                Se enviaron <strong>${payment.amountMXN.toFixed(2)} MXN</strong> en PXO al
                comercio. La transferencia está confirmada en cadena.
              </>
            ) : (
              <>
                Enviaste <strong>${payment.amountMXN.toFixed(2)} MXN</strong> al comercio.
                La red está procesando la transferencia de PXO.
              </>
            )}
          </div>
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: '#f1f5f9',
              fontSize: 12,
              color: '#64748b',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            Tx: {shortHash(payment.txHash ?? sentTxHash)}
          </div>
          {!isConfirmed && pollError && (
            <div style={{ fontSize: 12, color: '#b45309' }}>
              Sin conexión con el servidor de pagos — reintentando…
            </div>
          )}
          {!isConfirmed && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              El comercio recibirá confirmación automática cuando la tx se mine.
            </div>
          )}
          <button
            className="btn-primary"
            style={{ marginTop: 8, width: '100%' }}
            onClick={handleGoHome}
          >
            {isConfirmed ? 'Volver al inicio' : 'Ir al inicio'}
          </button>
          {!isConfirmed && (
            <button className="btn-secondary" style={{ width: '100%' }} onClick={onCancel}>
              Ver estado del pago
            </button>
          )}
        </div>
      </>
    );
  }

  const remaining = new Date(payment.expiresAt).getTime() - now;
  const expired = payment.status === 'EXPIRED' || remaining <= 0;
  const canPay =
    !expired && payment.status === 'PENDING' && !paying && !!account && !!wallet;
  const inAppWallet = isEmbeddedThirdwebWallet(wallet);

  return (
    <>
      <ScreenHeader title="Confirmar pago" onBack={onBack} />

      <div className="merchant-card">
        <div className="merchant-logo">{payment.merchantWallet.slice(2, 4).toUpperCase()}</div>
        <div className="merchant-name">Comercio</div>
        <div className="merchant-loc">{shortAddr(payment.merchantWallet)}</div>
        <div className="merchant-amount">
          <span className="currency">$</span>
          {Math.floor(payment.amountMXN)}
          <span className="cents">
            .{(payment.amountMXN % 1).toFixed(2).slice(2)}
          </span>
        </div>
        <div className="merchant-equiv">MXN · chain {payment.chainId}</div>
      </div>

      <div className="detail-list">
        <div className="detail-row">
          <div className="detail-key">Estado</div>
          <div className="detail-val">{payment.status}</div>
        </div>
        {payment.reference && (
          <div className="detail-row">
            <div className="detail-key">Referencia</div>
            <div className="detail-val">{payment.reference}</div>
          </div>
        )}
        <div className="detail-row">
          <div className="detail-key">Vence en</div>
          <div className="detail-val">{expired ? 'Expirado' : formatMs(remaining)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-key">amount PXO</div>
          <div className="detail-val">{payment.amountPXO}</div>
        </div>
      </div>

      <div className="cta-zone">
        {expired ? (
          <button className="btn-secondary" onClick={onCancel}>
            QR expirado — volver
          </button>
        ) : (
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: inAppWallet ? '#eef2ff' : '#f5f7ff',
                color: inAppWallet ? '#0f172a' : '#334155',
                fontSize: inAppWallet ? 14 : 13,
                lineHeight: 1.4,
              }}
            >
              {inAppWallet ? (
                <>
                  Monto <strong>${payment.amountMXN.toFixed(2)} MXN</strong> al comercio. Tocá
                  confirmar para enviar PXO en la red {payment.chainId}.
                </>
              ) : (
                <>
                  Firmá la transferencia desde tu wallet EVM (Thirdweb In-App, MetaMask, Trust
                  Wallet) con el URI del QR. Cuando la tx se mine en chain {payment.chainId}, este
                  panel se actualiza a <strong>CONFIRMED</strong> automáticamente.
                </>
              )}
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: 12 }}
              disabled={!canPay}
              onClick={() => void handlePay()}
            >
              {paying
                ? inAppWallet
                  ? 'Enviando…'
                  : 'Esperando firma…'
                : inAppWallet
                  ? 'Confirmar'
                  : 'Pagar con mi wallet'}
            </button>
            {payError && (
              <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 10 }}>{payError}</div>
            )}
            <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 8 }}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </>
  );
}

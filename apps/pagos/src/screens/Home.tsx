import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CardIcon,
  InfoIcon,
  PlusIcon,
  QrIcon,
} from '../components/icons';
import { balance as mockBalance, recentMovements } from '../data/mockData';
import { useAuthContext } from '../contexts/AuthContext';
import { USE_MOCK_DATA } from '../config/env';
import { formatPxoBalanceHome, usePXOTokenBalance } from '../hooks/usePXOTokenBalance';
import type { MovementType, ScreenId } from '../types';
import { useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { useEffect } from 'react';
import { polygon, polygonAmoy } from 'thirdweb/chains';

interface Props {
  onNavigate: (id: ScreenId) => void;
}

function MovementIcon({ type }: { type: MovementType }) {
  if (type === 'in') return <ArrowDownLeftIcon width={18} height={18} strokeWidth={2.5} />;
  if (type === 'pay') return <QrIcon width={16} height={16} strokeWidth={2} />;
  if (type === 'load') return <CardIcon />;
  return <ArrowUpRightIcon width={18} height={18} strokeWidth={2.5} />;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function Home({ onNavigate }: Props) {
  const { user, account } = useAuthContext();
  const pxoChain = usePXOTokenBalance({ enabled: !USE_MOCK_DATA });
  const balance = USE_MOCK_DATA ? mockBalance : formatPxoBalanceHome(pxoChain.displayBalance);
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const isOnMainnet = activeChain?.id === 137;
  const isOnTestnet = activeChain?.id === 80002;

  // Auto-switch a mainnet si la red no es ni mainnet ni testnet
  useEffect(() => {
    if (activeChain && !isOnMainnet && !isOnTestnet) switchChain(polygon);
  }, [activeChain?.id]);

  const handleNetworkToggle = () => {
    if (isOnMainnet) switchChain(polygonAmoy);
    else switchChain(polygon);
  };

  const greetingName =
    user?.mail || (account?.address ? shortAddr(account.address) : 'invitado');
  const networkLabel = isOnMainnet ? 'Polygon' : isOnTestnet ? 'Amoy' : '—';

  return (
    <>
      <div className="home-hero">
        <div className="greet">
          <div className="greet-name">
            <span>Hola, </span>
            {greetingName}
          </div>
          <div className="greet-actions">
            {activeChain !== undefined && (
              <button
                onClick={handleNetworkToggle}
                title={isOnMainnet ? 'Cambiar a Testnet' : 'Cambiar a Mainnet'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: `1px solid ${isOnTestnet ? 'var(--gold)' : 'var(--line2)'}`,
                  background: isOnTestnet ? 'rgba(180,83,9,0.10)' : 'var(--accent2)',
                  color: isOnTestnet ? 'var(--gold)' : 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isOnMainnet ? 'var(--green)' : 'var(--gold)',
                  flexShrink: 0,
                }} />
                {networkLabel}
              </button>
            )}
            <div className="icon-btn">
              <InfoIcon />
            </div>
          </div>
        </div>

        <div className="bal-label">Tu saldo</div>
        <div className="bal-headline">
          <span className="currency">PXO</span>
          {balance.whole}
          <span className="cents">{balance.cents}</span>
        </div>
        <div className="bal-eq">
          <span className="pulse" />
          <span>
            Equivalente a <strong>{balance.equivalent}</strong>
          </span>
        </div>
      </div>

      <div className="tagline">
        <div className="tagline-text">
          El peso mexicano digital,
          <br />
          <em>sin fronteras.</em>
        </div>
      </div>

      <div className="qa-section">
        <div className="qa-title">Movimientos rápidos</div>
        <div className="qa-grid">
          <div className="qa-item" onClick={() => onNavigate('enviar')}>
            <div className="qa-ic">
              <ArrowUpRightIcon />
            </div>
            <div className="qa-lb">Enviar</div>
          </div>
          <div className="qa-item" onClick={() => onNavigate('recibir')}>
            <div className="qa-ic">
              <ArrowDownLeftIcon />
            </div>
            <div className="qa-lb">Recibir</div>
          </div>
          <div className="qa-item" onClick={() => onNavigate('pagar')}>
            <div className="qa-ic">
              <QrIcon />
            </div>
            <div className="qa-lb">Pagar</div>
          </div>
          <div className="qa-item" onClick={() => onNavigate('cargar')}>
            <div className="qa-ic">
              <PlusIcon />
            </div>
            <div className="qa-lb">Fondear</div>
          </div>
        </div>
      </div>

      <div className="mov-section">
        <div className="mov-head">
          <div className="mov-h1">Tu actividad</div>
          <div className="mov-link" onClick={() => onNavigate('actividad')}>
            Ver todo
          </div>
        </div>

        {recentMovements.length === 0 ? (
          <div className="act-empty" style={{ paddingTop: 12 }}>
            <div className="act-empty-txt">Aún no hay movimientos.</div>
          </div>
        ) : (
          recentMovements.map((mov) => (
            <div key={mov.id} className="mov">
              <div className={`mov-ic ${mov.type === 'pay' ? 'out' : mov.type}`}>
                <MovementIcon type={mov.type} />
              </div>
              <div className="mov-info">
                <div className="mov-title">{mov.title}</div>
                <div className="mov-sub">{mov.subtitle}</div>
              </div>
              <div className={`mov-amt${mov.amount.startsWith('+') ? ' in' : ''}`}>{mov.amount}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

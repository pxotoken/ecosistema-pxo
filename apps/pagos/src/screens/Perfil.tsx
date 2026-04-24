import { ScreenHeader } from '../components/ScreenHeader';
import { useAuthContext } from '../contexts/AuthContext';
import type { LinkedAccount } from '../hooks/useAuth';

interface Props {
  onBack: () => void;
  onToast: (msg: string) => void;
}

function shortAddr(addr: string): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function providerLabel(acc: LinkedAccount): string {
  const wp = (acc.walletProvider || '').toLowerCase();
  if (acc.providerClass === 'in_app_wallet' || wp.includes('inapp') || wp.includes('embedded')) {
    return 'In-App Wallet';
  }
  if (wp.includes('metamask')) return 'MetaMask';
  if (wp.includes('trust')) return 'Trust Wallet';
  if (wp.includes('coinbase')) return 'Coinbase Wallet';
  if (wp.includes('rainbow')) return 'Rainbow';
  if (wp.includes('walletconnect')) return 'WalletConnect';
  if (acc.providerClass === 'external_wallet') return 'Wallet externa';
  return wp ? wp : 'Wallet';
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'hace unos segundos';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function primaryIdentifier(acc: LinkedAccount): string {
  if (acc.mail && !acc.mail.endsWith('@wallet.local')) return acc.mail;
  return providerLabel(acc);
}

export function Perfil({ onBack, onToast }: Props) {
  const { account, user, linkedAccounts, activeAddress, switchAccount, addAccount, logout } =
    useAuthContext();

  const activeAddr = (account?.address ?? activeAddress ?? '').toLowerCase();
  const others = linkedAccounts.filter((a) => a.address.toLowerCase() !== activeAddr);
  const activeEntry = linkedAccounts.find((a) => a.address.toLowerCase() === activeAddr);

  const activeMail = activeEntry?.mail || user?.mail || '';
  const activeDisplayAddr = account?.address ?? activeEntry?.address ?? '';
  const activeProvider = activeEntry ? providerLabel(activeEntry) : '';

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onToast(`${label} copiado`);
    } catch {
      onToast('No se pudo copiar');
    }
  };

  return (
    <>
      <ScreenHeader title="Perfil" onBack={onBack} />

      <div className="form-section" style={{ paddingTop: 8 }}>
        <div className="manual-intro">
          <div className="manual-intro-title">Cuenta activa</div>
          <div className="manual-intro-sub">Con esta cuenta operás en esta sesión.</div>
        </div>

        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 14,
            display: 'grid',
            gap: 10,
            background: '#f8fafc',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Email
            </div>
            <div
              style={{ fontSize: 15, fontWeight: 600, cursor: activeMail ? 'pointer' : 'default' }}
              onClick={() => activeMail && copy(activeMail, 'Email')}
            >
              {activeMail || '(sin email asociado)'}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Wallet
            </div>
            <div
              style={{
                fontSize: 13,
                fontFamily: 'ui-monospace, monospace',
                cursor: activeDisplayAddr ? 'pointer' : 'default',
              }}
              onClick={() => activeDisplayAddr && copy(activeDisplayAddr, 'Address')}
            >
              {activeDisplayAddr ? shortAddr(activeDisplayAddr) : '—'}
            </div>
          </div>
          {activeProvider && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Proveedor
              </div>
              <div style={{ fontSize: 13 }}>{activeProvider}</div>
            </div>
          )}
        </div>

        {others.length > 0 && (
          <>
            <div className="manual-intro" style={{ marginTop: 18 }}>
              <div className="manual-intro-title">Otras cuentas asociadas</div>
              <div className="manual-intro-sub">
                Tocá una para usarla en esta sesión (te vamos a pedir reconectar).
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {others.map((acc) => (
                <div
                  key={acc.address}
                  onClick={() => switchAccount(acc.address)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '2px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {primaryIdentifier(acc)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {shortAddr(acc.address)}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {providerLabel(acc)} · usada {relativeTime(acc.lastUsed)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn-primary" style={{ marginTop: 18 }} onClick={addAccount}>
          Asociar otra cuenta
        </button>

        <button className="btn-secondary" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

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

        <div className="perfil-card">
          <div>
            <div className="field-label">Email</div>
            <div
              className="perfil-card-value"
              style={{ cursor: activeMail ? 'pointer' : 'default' }}
              onClick={() => activeMail && copy(activeMail, 'Email')}
            >
              {activeMail || '(sin email asociado)'}
            </div>
          </div>
          <div>
            <div className="field-label">Wallet</div>
            <div
              className="perfil-card-value perfil-card-mono"
              style={{ cursor: activeDisplayAddr ? 'pointer' : 'default' }}
              onClick={() => activeDisplayAddr && copy(activeDisplayAddr, 'Address')}
            >
              {activeDisplayAddr ? shortAddr(activeDisplayAddr) : '—'}
            </div>
          </div>
          {activeProvider && (
            <div>
              <div className="field-label">Proveedor</div>
              <div className="perfil-card-value">{activeProvider}</div>
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
                  className="perfil-account-row"
                  onClick={() => switchAccount(acc.address)}
                >
                  <div className="perfil-account-dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="perfil-account-name">{primaryIdentifier(acc)}</div>
                    <div className="perfil-account-addr">{shortAddr(acc.address)}</div>
                    <div className="perfil-account-meta">
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

import { useAuthContext } from '../contexts/AuthContext';

export function Login() {
  const { connect, loading, error, isLoadingAutoConnect } = useAuthContext();

  const busy = loading || isLoadingAutoConnect;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 32,
        textAlign: 'center',
        color: '#0f172a',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'linear-gradient(135deg, #1B2A6B, #3b5bdb)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 36,
          fontWeight: 700,
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(27, 42, 107, 0.25)',
        }}
      >
        P
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Bienvenido a PXO Wallet
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32, lineHeight: 1.5 }}>
        Conectá tu wallet para recibir, enviar y pagar con PXO.
      </p>

      <button
        className="btn-primary"
        onClick={connect}
        disabled={busy}
        style={{ minWidth: 220 }}
      >
        {busy ? 'Cargando…' : 'Conectar wallet'}
      </button>

      {error && (
        <div
          style={{
            color: '#b91c1c',
            fontSize: 13,
            marginTop: 18,
            maxWidth: 280,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          fontSize: 12,
          color: '#94a3b8',
          marginTop: 28,
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        Podés usar MetaMask, Coinbase Wallet, Trust o crear una In-App Wallet
        con tu email.
      </div>
    </div>
  );
}

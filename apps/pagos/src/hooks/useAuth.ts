import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useActiveAccount,
  useActiveWallet,
  useAutoConnect,
  useConnectModal,
  useDisconnect,
} from 'thirdweb/react';
import { polygon, polygonAmoy, bsc } from 'thirdweb/chains';

import { getUserEmail } from 'thirdweb/wallets/in-app';
import { getThirdwebClient } from '../lib/thirdweb-client';
import {
  JWT_EXPIRATION_SECONDS,
  generatePayload,
  signLoginPayload,
} from '../lib/auth-actions';

export interface AuthUser {
  id?: string;
  mail?: string;
  wallet_address?: string;
  [key: string]: unknown;
}

export interface LinkedAccount {
  address: string;
  mail: string;
  jwt: string;
  userId?: string;
  walletProvider?: string;
  providerClass?: 'in_app_wallet' | 'external_wallet' | string;
  lastUsed: number;
}

const client = getThirdwebClient();

function chainForId(id: number) {
  if (id === 137) return polygon;
  if (id === 56) return bsc;
  return polygonAmoy;
}

const PAYMENTS_CHAIN = chainForId(Number(import.meta.env.VITE_PAYMENTS_CHAIN_ID) || 80002);

const ACCOUNTS_KEY = 'pxo_accounts';
const ACTIVE_KEY = 'pxo_active_address';

function readAccounts(): Record<string, LinkedAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LinkedAccount>;
  } catch {
    return {};
  }
}

function writeAccounts(map: Record<string, LinkedAccount>): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map));
  } catch {
    // best effort
  }
}

function readActiveAddress(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActiveAddress(addr: string | null): void {
  try {
    if (addr) localStorage.setItem(ACTIVE_KEY, addr);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // best effort
  }
}

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // best effort
    }
  },
  clearActiveSession(): void {
    try {
      localStorage.removeItem('pxo_jwt');
      localStorage.removeItem('pxo_user');
    } catch {
      // best effort
    }
  },
  clearAll(): void {
    try {
      localStorage.removeItem('pxo_jwt');
      localStorage.removeItem('pxo_user');
      localStorage.removeItem(ACCOUNTS_KEY);
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // best effort
    }
  },
  getCookie(name: string): string | null {
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    if (parts.length === 2) {
      const raw = parts.pop()?.split(';').shift() || null;
      return raw ? decodeURIComponent(raw) : null;
    }
    return null;
  },
};

function getWalletProviderInfo(wallet: unknown) {
  const anyWallet = wallet as {
    id?: string;
    getConfig?: () => { id?: string; walletId?: string; type?: string };
  };
  const walletId =
    anyWallet?.id ||
    anyWallet?.getConfig?.()?.id ||
    anyWallet?.getConfig?.()?.walletId ||
    anyWallet?.getConfig?.()?.type ||
    'unknown';
  const lower = String(walletId).toLowerCase();
  const providerClass =
    lower.includes('inapp') || lower.includes('embedded')
      ? 'in_app_wallet'
      : 'external_wallet';
  return { walletProvider: String(walletId), providerClass };
}

export default function useAuth(onLogin?: () => void) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { data: autoConnected, isLoading: isLoadingAutoConnect } = useAutoConnect(
    client ? { client } : ({} as never),
  );
  const { connect } = useConnectModal();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(() =>
    Object.values(readAccounts()).sort((a, b) => b.lastUsed - a.lastUsed),
  );
  const sessionMonitorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isWalletConnected = useCallback(
    (): boolean => !!(wallet && account),
    [wallet, account],
  );

  const refreshLinkedAccountsState = useCallback(() => {
    setLinkedAccounts(
      Object.values(readAccounts()).sort((a, b) => b.lastUsed - a.lastUsed),
    );
  }, []);

  const upsertLinkedAccount = useCallback(
    (entry: Omit<LinkedAccount, 'lastUsed'> & { lastUsed?: number }) => {
      const map = readAccounts();
      map[entry.address.toLowerCase()] = {
        address: entry.address,
        mail: entry.mail,
        jwt: entry.jwt,
        userId: entry.userId,
        walletProvider: entry.walletProvider,
        providerClass: entry.providerClass,
        lastUsed: entry.lastUsed ?? Date.now(),
      };
      writeAccounts(map);
      writeActiveAddress(entry.address.toLowerCase());
      refreshLinkedAccountsState();
    },
    [refreshLinkedAccountsState],
  );

  const handleLogin = useCallback(async () => {
    if (!account || !wallet) {
      setError('Please connect your wallet first');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const payload = await generatePayload({
        address: account.address,
        chainId: PAYMENTS_CHAIN.id,
      });
      const signatureResult = await signLoginPayload({ account, payload });

      const response = await fetch('/api/auth/login-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payload: signatureResult }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Login failed');
      }

      const result = (await response.json()) as { jwt?: string; user: AuthUser };
      const jwt = result.jwt || 'temp-jwt';

      // Thirdweb In-App Wallet metadata can take a moment to propagate, so
      // the backend may have responded with an empty / placeholder email.
      // Fall back to querying Thirdweb directly for the email of the
      // currently connected In-App Wallet, if any.
      let bestMail = (result.user?.mail as string) || '';
      if (client && (!bestMail || bestMail.endsWith('@wallet.local'))) {
        try {
          const twMail = await getUserEmail({ client });
          if (twMail) bestMail = twMail;
        } catch {
          // best effort — leave whatever the backend gave us
        }
      }

      const providerInfo = getWalletProviderInfo(wallet);
      const finalUser: AuthUser = { ...result.user, mail: bestMail };
      storage.set('pxo_jwt', jwt);
      storage.set('pxo_user', JSON.stringify(finalUser));
      setUser(finalUser);
      setIsAuthenticated(true);
      setSessionStartTime(Date.now());

      upsertLinkedAccount({
        address: account.address,
        mail: bestMail,
        jwt,
        userId: (result.user?.id as string | undefined) ?? undefined,
        walletProvider: providerInfo.walletProvider,
        providerClass: providerInfo.providerClass,
      });

      // Best-effort: tell the backend which wallet kind logged in.
      try {
        await fetch('/api/auth/provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(providerInfo),
        });
      } catch {
        // non-fatal
      }

      onLogin?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsAuthenticated(false);
      setUser(null);
      storage.clearActiveSession();
    } finally {
      setLoading(false);
    }
  }, [account, wallet, onLogin, upsertLinkedAccount]);

  // Check stored auth on mount, and whenever the wallet changes.
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const jwt = storage.getCookie('pxo_jwt') || storage.get('pxo_jwt');
        const userRaw = storage.getCookie('pxo_user') || storage.get('pxo_user');

        if (!isWalletConnected()) {
          setIsAuthenticated(false);
          setUser(null);
          storage.clearActiveSession();
          setLoading(false);
          return;
        }

        // If the currently connected wallet matches a linked account, prefer
        // restoring from that entry (keeps multi-account state authoritative).
        if (account) {
          const entry = readAccounts()[account.address.toLowerCase()];
          if (entry) {
            storage.set('pxo_jwt', entry.jwt);
            writeActiveAddress(entry.address.toLowerCase());
            setUser({ id: entry.userId, mail: entry.mail, wallet_address: entry.address });
            setIsAuthenticated(true);
            if (!sessionStartTime) setSessionStartTime(Date.now());
            return;
          }
        }

        if (jwt && userRaw) {
          try {
            setUser(JSON.parse(userRaw) as AuthUser);
            setIsAuthenticated(true);
            if (!sessionStartTime) setSessionStartTime(Date.now());
            return;
          } catch {
            // fall through to re-login
          }
        }

        if (isWalletConnected() && !isAuthenticated) {
          await handleLogin();
          return;
        }

        setIsAuthenticated(false);
        setUser(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'auth check failed');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, account]);

  // Session monitor — stops at expiry.
  useEffect(() => {
    if (isAuthenticated && sessionStartTime) {
      if (sessionMonitorRef.current) clearInterval(sessionMonitorRef.current);
      sessionMonitorRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const remaining = JWT_EXPIRATION_SECONDS - elapsed;
        if (remaining <= 0 && sessionMonitorRef.current) {
          clearInterval(sessionMonitorRef.current);
          sessionMonitorRef.current = null;
        }
      }, 5_000);
      return () => {
        if (sessionMonitorRef.current) {
          clearInterval(sessionMonitorRef.current);
          sessionMonitorRef.current = null;
        }
      };
    }
  }, [isAuthenticated, sessionStartTime]);

  const handleConnect = useCallback(async () => {
    if (!client) {
      setError('Thirdweb client not configured (VITE_THIRDWEB_CLIENT_ID)');
      return;
    }
    try {
      setError(null);
      await connect({ client, chain: PAYMENTS_CHAIN, chains: [PAYMENTS_CHAIN] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  }, [connect]);

  /**
   * Associate another account without losing the current one. Disconnects the
   * current wallet (so Thirdweb shows the picker cleanly) and opens the
   * connect modal. After the new wallet is connected + signed, `handleLogin`
   * runs via the effect above and upserts into `pxo_accounts`.
   */
  const addAccount = useCallback(async () => {
    try {
      if (wallet) await disconnect(wallet);
      storage.clearActiveSession();
      setIsAuthenticated(false);
      setUser(null);
      await handleConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start add-account flow');
    }
  }, [disconnect, handleConnect, wallet]);

  /**
   * Switch the active account. If the wallet for `address` is not the one
   * currently connected, we disconnect and ask the user to reconnect — we do
   * not keep raw Thirdweb wallet objects in memory across switches.
   *
   * The linked-account entry keeps its JWT available; on re-connect with the
   * same address, the effect restores the session without a new signature.
   */
  const switchAccount = useCallback(
    async (targetAddress: string) => {
      const normalized = targetAddress.toLowerCase();
      const accounts = readAccounts();
      const target = accounts[normalized];
      if (!target) {
        setError('Cuenta no asociada');
        return;
      }

      // Same address already active: just flip the active pointer.
      if (account && account.address.toLowerCase() === normalized) {
        writeActiveAddress(normalized);
        refreshLinkedAccountsState();
        return;
      }

      // Different address: disconnect current, keep entry intact, and open
      // connect modal for the user to pick the right wallet/email.
      try {
        if (wallet) await disconnect(wallet);
        storage.clearActiveSession();
        setIsAuthenticated(false);
        setUser(null);
        writeActiveAddress(normalized);
        refreshLinkedAccountsState();
        await handleConnect();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch account');
      }
    },
    [account, disconnect, handleConnect, refreshLinkedAccountsState, wallet],
  );

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      if (sessionMonitorRef.current) {
        clearInterval(sessionMonitorRef.current);
        sessionMonitorRef.current = null;
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(
        () => {},
      );
      // Only clear the active session, not the list of linked accounts.
      storage.clearActiveSession();
      writeActiveAddress(null);
      setUser(null);
      setIsAuthenticated(false);
      setSessionStartTime(null);
      if (wallet) {
        await disconnect(wallet);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [disconnect, wallet]);

  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
    storage.set('pxo_user', JSON.stringify(u));
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const res = await fetch('/api/users/me', { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to refresh profile: ${res.status}`);
    const body = (await res.json()) as { user?: AuthUser };
    if (body.user) {
      setUser(body.user);
      storage.set('pxo_user', JSON.stringify(body.user));
    }
  }, []);

  const activeAddress = account?.address?.toLowerCase() ?? readActiveAddress();

  return {
    user,
    isAuthenticated,
    loading,
    error,
    sessionStartTime,
    wallet,
    account,
    autoConnected,
    isLoadingAutoConnect,
    linkedAccounts,
    activeAddress,
    login: handleLogin,
    logout: handleLogout,
    connect: handleConnect,
    disconnect,
    updateUser,
    refreshUserProfile,
    clearError: () => setError(null),
    addAccount,
    switchAccount,
  };
}

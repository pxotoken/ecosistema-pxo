import { createContext, useContext, type ReactNode } from 'react';
import useAuth, { type AuthUser, type LinkedAccount } from '../hooks/useAuth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  sessionStartTime: number | null;

  wallet: ReturnType<typeof useAuth>['wallet'];
  account: ReturnType<typeof useAuth>['account'];
  autoConnected: boolean;
  isLoadingAutoConnect: boolean;

  linkedAccounts: LinkedAccount[];
  activeAddress: string | null;

  login: () => void;
  logout: () => void;
  connect: () => void;
  disconnect: () => void;
  updateUser: (user: AuthUser) => void;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
  addAccount: () => void;
  switchAccount: (address: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  onLoginSuccess,
}: {
  children: ReactNode;
  onLoginSuccess?: () => void;
}) {
  const auth = useAuth(onLoginSuccess);

  const value: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    loading: auth.loading,
    error: auth.error,
    sessionStartTime: auth.sessionStartTime,
    wallet: auth.wallet,
    account: auth.account,
    autoConnected: auth.autoConnected ?? false,
    isLoadingAutoConnect: auth.isLoadingAutoConnect ?? false,
    linkedAccounts: auth.linkedAccounts,
    activeAddress: auth.activeAddress ?? null,
    login: auth.login,
    logout: auth.logout,
    connect: auth.connect,
    disconnect: () => {
      if (auth.wallet) auth.disconnect(auth.wallet);
    },
    updateUser: auth.updateUser,
    refreshUserProfile: auth.refreshUserProfile,
    clearError: auth.clearError,
    addAccount: auth.addAccount,
    switchAccount: auth.switchAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}

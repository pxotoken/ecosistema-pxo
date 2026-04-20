import React, { createContext, useContext, ReactNode } from 'react';
import useAuth from '../hooks/useAuth';
import { User } from '@pxo/shared/types';

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  sessionStartTime: number | null;
  
  // Wallet state
  wallet: any;
  account: any;
  autoConnected: boolean;
  isLoadingAutoConnect: boolean;
  
  // Auth actions
  login: () => void;
  logout: () => void;
  connect: () => void;
  disconnect: () => void;
  updateUser: (user: User) => void;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  onLoginSuccess?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  onLoginSuccess 
}) => {
  const authHook = useAuth(onLoginSuccess);

  const contextValue: AuthContextType = {
    // Auth state
    isAuthenticated: authHook.isAuthenticated,
    user: authHook.user,
    loading: authHook.loading,
    error: authHook.error,
    sessionStartTime: authHook.sessionStartTime,
    
    // Wallet state
    wallet: authHook.wallet,
    account: authHook.account,
    autoConnected: authHook.autoConnected || false,
    isLoadingAutoConnect: authHook.isLoadingAutoConnect || false,
    
    // Auth actions
    login: authHook.login,
    logout: authHook.logout,
    connect: authHook.connect,
    disconnect: () => {
      if (authHook.wallet) {
        authHook.disconnect(authHook.wallet as any);
      }
    },
    updateUser: authHook.updateUser,
    refreshUserProfile: authHook.refreshUserProfile,
    clearError: authHook.clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

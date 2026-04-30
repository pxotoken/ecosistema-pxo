import { useCallback, useEffect, useState, useRef } from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useConnectModal,
  useDisconnect,
  useAutoConnect,
} from "thirdweb/react";

import { generatePayload, signLoginPayload, JWT_EXPIRATION_SECONDS } from "../lib/authActions";
import api from "../lib/api";
import { User } from '@pxo/shared/types';
import { getThirdwebClient } from "../lib/client";
import useKYCRealtime from './useKYCRealtime';
import useWalletStore from "../store/useWalletStore";

const client = getThirdwebClient();

const getWalletProviderInfo = (wallet: any) => {
  const walletId =
    wallet?.id ||
    wallet?.getConfig?.()?.id ||
    wallet?.getConfig?.()?.walletId ||
    wallet?.getConfig?.()?.type ||
    "unknown";

  const normalizedWalletId = String(walletId);
  const lowerWalletId = normalizedWalletId.toLowerCase();
  const providerClass = lowerWalletId.includes("inapp") || lowerWalletId.includes("embedded")
    ? "in_app_wallet"
    : "external_wallet";

  return {
    walletProvider: normalizedWalletId,
    providerClass,
  };
};

const useAuth = (onLogin?: () => void) => {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { data: autoConnected, isLoading: isLoadingAutoConnect } = useAutoConnect({ client });
  
  const { currentChains } = useWalletStore();
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const sessionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  
  const { connect } = useConnectModal();

  // Storage helpers
  const storage = {
    getCookie: (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift() || null;
        return cookieValue ? decodeURIComponent(cookieValue) : null;
      }
      return null;
    },

    get: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error(`Error getting ${key} from localStorage:`, error);
        return null;
      }
    },

    set: (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error(`Error setting ${key} to localStorage:`, error);
      }
    },

    clear: (): void => {
      try {
        localStorage.removeItem('pxo_jwt');
        localStorage.removeItem('pxo_user');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    },
  };

  // Helper to check if wallet is connected
  const isWalletConnected = (): boolean => !!(wallet && account);

  // Check authentication status on mount and when wallet connects
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try cookies first, then localStorage as fallback
        const jwtCookie = storage.getCookie('pxo_jwt');
        const userCookie = storage.getCookie('pxo_user');
        const jwtStorage = storage.get('pxo_jwt');
        const userStorage = storage.get('pxo_user');
        
        const hasJWT = jwtCookie || jwtStorage;
        const hasUser = userCookie || userStorage;
        
        console.log("🔍 Checking auth status:", {
          hasWallet: isWalletConnected(),
          hasJWT: !!hasJWT,
          hasUser: !!hasUser,
          jwtSource: jwtCookie ? 'cookie' : jwtStorage ? 'localStorage' : 'none',
          userSource: userCookie ? 'cookie' : userStorage ? 'localStorage' : 'none'
        });

        // If wallet is disconnected, clear auth state
        if (!isWalletConnected()) {
          console.log("🔓 Wallet disconnected, clearing auth state");
          setIsAuthenticated(false);
          setUser(null);
          storage.clear();
          setLoading(false);
          return;
        }

        // If we have auth data, try to restore session
        if (hasJWT && hasUser) {
          try {
            const userData = userCookie ? JSON.parse(userCookie) : JSON.parse(userStorage!);
            setUser(userData);
            setIsAuthenticated(true);
            
            // Start session monitor if not already started
            if (!sessionStartTime) {
              setSessionStartTime(Date.now());
              console.log("✅ Auth restored from", userCookie ? 'cookies' : 'localStorage');
              console.log(`⏰ Session monitor started - Duration: ${JWT_EXPIRATION_SECONDS} seconds (${Math.floor(JWT_EXPIRATION_SECONDS / 60)} minutes)`);
            }
            return;
          } catch (error) {
            console.error("Error parsing user data:", error);
          }
        }

        // If wallet is connected but no session, try to login
        if (isWalletConnected() && !isAuthenticated && !loading) {
          console.log("🔐 Wallet connected, attempting auto-login...");
          await handleLogin();
          return;
        }

        // If we have JWT but no user, try to verify
        if (hasJWT && !user) {
          console.log("🔍 Verifying JWT with server...");
          try {
            const jwtToken = jwtCookie || jwtStorage;
            const { data: result } = await api.post('/api/auth/verify-localStorage', { jwt: jwtToken });
            setUser(result.user);
            setIsAuthenticated(true);
            console.log("✅ Auth verified successfully");
            return;
          } catch (error) {
            console.error("Error verifying JWT:", error);
          }
        }

        // No authentication found
        setIsAuthenticated(false);
        setUser(null);
        
      } catch (error) {
        console.error("Error checking auth status:", error);
        setError("Failed to check authentication status");
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [wallet, account, isAuthenticated]);

  // Handle wallet disconnection
  useEffect(() => {
    if (!wallet && isAuthenticated) {
      console.log("🔓 Wallet disconnected while authenticated, clearing auth state...");
      // Clear local state immediately
      setIsAuthenticated(false);
      setUser(null);
      storage.clear();
      
      api.post('/api/auth/logout').catch(error => {
        console.error("Error clearing cookies on wallet disconnect:", error);
      });
    }
  }, [wallet, isAuthenticated]);

  // Handle login process
  const handleLogin = useCallback(async () => {
    if (!isWalletConnected()) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔐 Starting login process...");
      
      // Generate and sign payload
      const payload = await generatePayload({ address: account.address });
      const signatureResult = await signLoginPayload({ account, payload });
      
      console.log("📝 Payload signed successfully");

      // Send to login API (use Vercel-optimized endpoint in production)
      const loginEndpoint = '/api/auth/login-vercel';
      console.log('🌐 Using login endpoint:', loginEndpoint);
      
      const { data: result } = await api.post(loginEndpoint, { payload: signatureResult });
      
      // Store in localStorage as fallback for Vercel
      storage.set('pxo_jwt', result.jwt || 'temp-jwt');
      storage.set('pxo_user', JSON.stringify(result.user));
      
      setUser(result.user);
      setIsAuthenticated(true);
      setError(null);
      setSessionStartTime(Date.now());
      
      console.log("✅ Login successful");
      console.log(`⏰ Session duration: ${JWT_EXPIRATION_SECONDS} seconds (${Math.floor(JWT_EXPIRATION_SECONDS / 60)} minutes)`);

      try {
        const providerInfo = getWalletProviderInfo(wallet);
        await api.post('/api/auth/provider', providerInfo);
      } catch (providerSyncError) {
        console.error("❌ Failed to sync auth provider post-login:", providerSyncError);
      }
      
      // Execute onLogin callback if provided
      if (onLogin) {
        onLogin();
      }
      
    } catch (error) {
      console.error("❌ Login failed:", error);
      setError(error instanceof Error ? error.message : "Login failed");
      setIsAuthenticated(false);
      setUser(null);
      storage.clear();
    } finally {
      setLoading(false);
    }
  }, [account, wallet, onLogin]);

  // Session monitor effect
  useEffect(() => {
    if (isAuthenticated && sessionStartTime) {
      if (sessionMonitorRef.current) {
        clearInterval(sessionMonitorRef.current);
      }

      sessionMonitorRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTime) / 1000);
        const remaining = JWT_EXPIRATION_SECONDS - elapsed;
        
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60);
          const seconds = remaining % 60;
          console.log(`⏱️ Session time remaining: ${minutes}m ${seconds}s (${remaining}s)`);
        } else {
          console.log("⏰ Session expired");
          if (sessionMonitorRef.current) {
            clearInterval(sessionMonitorRef.current);
            sessionMonitorRef.current = null;
          }
        }
      }, 5000);

      return () => {
        if (sessionMonitorRef.current) {
          clearInterval(sessionMonitorRef.current);
          sessionMonitorRef.current = null;
        }
      };
    }
  }, [isAuthenticated, sessionStartTime]);

  useKYCRealtime(user?.id, user?.KYC_status, () => refreshUserProfile().catch(() => {}));

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      
      if (sessionMonitorRef.current) {
        clearInterval(sessionMonitorRef.current);
        sessionMonitorRef.current = null;
      }
      
      await api.post('/api/auth/logout');
      
      // Clear local state and storage
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setSessionStartTime(null);
      storage.clear();
      
      // Disconnect wallet only if it's still connected
      if (wallet) {
        await disconnect(wallet as any);
      }
      
      console.log("✅ Logout successful");
      
    } catch (error) {
      console.error("❌ Logout failed:", error);
      setError("Logout failed");
    } finally {
      setLoading(false);
    }
  }, [disconnect, wallet]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      setError(null);
      await connect({ 
        client,
        chain: currentChains[0], // Use first chain (Polygon mainnet)
        chains: currentChains,
      });
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      setError("Failed to connect wallet");
    }
  }, [connect, client, currentChains]);

  // Update user data directly (useful when endpoint returns updated user)
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    storage.set('pxo_user', JSON.stringify(updatedUser));
    console.log("✅ User data updated");
  }, []);

  // Refresh user profile from backend
  const refreshUserProfile = useCallback(async () => {
    console.log("🔄 Refreshing user profile from backend...");
    
    const { data: result } = await api.get('/api/users/me');

    if (result.user) {
      setUser(result.user);
      storage.set('pxo_user', JSON.stringify(result.user));
      console.log("✅ User profile refreshed successfully");
    } else {
      throw new Error('Invalid response from profile endpoint');
    }
  }, []);

  return {
    // Auth state
    user,
    isAuthenticated,
    loading,
    error,
    sessionStartTime,
    
    // Wallet state
    wallet,
    account,
    autoConnected,
    isLoadingAutoConnect,
    
    // Actions
    login: handleLogin,
    logout: handleLogout,
    connect: handleConnect,
    disconnect,
    updateUser,
    refreshUserProfile,
    
    // Utilities
    clearError: () => setError(null),
  };
};

export default useAuth; 
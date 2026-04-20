import { useEffect, useState, useCallback, useRef } from 'react';
import { JWT_EXPIRATION_SECONDS } from '../lib/authActions';

interface SessionExpirationState {
  isExpired: boolean;
  isAboutToExpire: boolean;
  remainingSeconds: number;
  sessionStartTime: number | null;
}

interface UseSessionExpirationOptions {
  warningThresholdSeconds?: number;
  onExpired?: () => void;
  onWarning?: (remainingSeconds: number) => void;
  enabled?: boolean;
}

export const useSessionExpiration = (options: UseSessionExpirationOptions = {}) => {
  const {
    warningThresholdSeconds = 120,
    onExpired,
    onWarning,
    enabled = true,
  } = options;

  const [state, setState] = useState<SessionExpirationState>({
    isExpired: false,
    isAboutToExpire: false,
    remainingSeconds: JWT_EXPIRATION_SECONDS,
    sessionStartTime: null,
  });

  const warningTriggeredRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useCallback(() => {
    const now = Date.now();
    setState({
      isExpired: false,
      isAboutToExpire: false,
      remainingSeconds: JWT_EXPIRATION_SECONDS,
      sessionStartTime: now,
    });
    warningTriggeredRef.current = false;
  }, []);

  const resetSession = useCallback(() => {
    startSession();
  }, [startSession]);

  const clearSession = useCallback(() => {
    setState({
      isExpired: false,
      isAboutToExpire: false,
      remainingSeconds: JWT_EXPIRATION_SECONDS,
      sessionStartTime: null,
    });
    warningTriggeredRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !state.sessionStartTime) {
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - state.sessionStartTime!) / 1000);
      const remaining = JWT_EXPIRATION_SECONDS - elapsed;

      if (remaining <= 0) {
        setState(prev => ({ ...prev, isExpired: true, remainingSeconds: 0 }));
        if (onExpired) {
          onExpired();
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (remaining <= warningThresholdSeconds && !warningTriggeredRef.current) {
        setState(prev => ({ ...prev, isAboutToExpire: true, remainingSeconds: remaining }));
        warningTriggeredRef.current = true;
        if (onWarning) {
          onWarning(remaining);
        }
      } else {
        setState(prev => ({ ...prev, remainingSeconds: remaining }));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, state.sessionStartTime, warningThresholdSeconds, onExpired, onWarning]);

  return {
    ...state,
    startSession,
    resetSession,
    clearSession,
    expirationTimeSeconds: JWT_EXPIRATION_SECONDS,
  };
};


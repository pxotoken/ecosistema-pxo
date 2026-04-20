import { useCallback, useEffect, useState } from 'react';
import { useSessionExpiration } from './useSessionExpiration';
import { useActivityDetection, ActivityType } from './useActivityDetection';

interface UseSessionManagerOptions {
  enabled?: boolean;
  autoRenewOnActivity?: boolean;
  warningThresholdSeconds?: number;
  onSessionExpired?: () => void;
  onRenewalRequired?: () => void;
  renewSession: () => Promise<void>;
  endSession: () => Promise<void>;
}

export const useSessionManager = (options: UseSessionManagerOptions) => {
  const {
    enabled = true,
    autoRenewOnActivity = true,
    warningThresholdSeconds = 120,
    onSessionExpired,
    onRenewalRequired,
    renewSession,
    endSession,
  } = options;

  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  const activity = useActivityDetection({
    enableAutoRenewal: autoRenewOnActivity,
    onCriticalActivity: (activity) => {
      console.log('🔥 Critical activity detected:', activity.type);
    },
  });

  const session = useSessionExpiration({
    warningThresholdSeconds,
    enabled,
    onExpired: () => {
      console.log('⏰ Session expired');
      if (activity.shouldPreventExpiration() && autoRenewOnActivity) {
        console.log('🔄 Auto-renewing due to critical activity');
        handleRenewSession();
      } else {
        setShowRenewalModal(false);
        console.log('🔴 Forcing logout due to session expiration');
        handleLogout();
        if (onSessionExpired) {
          onSessionExpired();
        }
      }
    },
    onWarning: (remainingSeconds) => {
      console.log('⚠️ Session expiring soon:', remainingSeconds, 'seconds');
      if (!activity.shouldPreventExpiration() || !autoRenewOnActivity) {
        setShowRenewalModal(true);
        if (onRenewalRequired) {
          onRenewalRequired();
        }
      }
    },
  });

  const handleRenewSession = useCallback(async () => {
    try {
      setIsRenewing(true);
      await renewSession();
      session.resetSession();
      setShowRenewalModal(false);
      console.log('✅ Session renewed successfully');
    } catch (error) {
      console.error('❌ Failed to renew session:', error);
    } finally {
      setIsRenewing(false);
    }
  }, [renewSession, session]);

  const handleLogout = useCallback(async () => {
    try {
      await endSession();
      session.clearSession();
      setShowRenewalModal(false);
    } catch (error) {
      console.error('❌ Failed to logout:', error);
    }
  }, [endSession, session]);

  useEffect(() => {
    if (session.isAboutToExpire && activity.shouldPreventExpiration() && autoRenewOnActivity) {
      console.log('🤖 Auto-renewing session due to critical activity');
      handleRenewSession();
    }
  }, [session.isAboutToExpire, activity, autoRenewOnActivity, handleRenewSession]);

  const startActivity = useCallback((type: ActivityType, metadata?: Record<string, any>) => {
    activity.startActivity(type, metadata);
  }, [activity]);

  const endActivity = useCallback((type?: ActivityType) => {
    activity.endActivity(type);
  }, [activity]);

  return {
    session: {
      ...session,
      showRenewalModal,
      isRenewing,
    },
    activity: {
      ...activity,
      startActivity,
      endActivity,
    },
    actions: {
      renewSession: handleRenewSession,
      logout: handleLogout,
      dismissModal: () => setShowRenewalModal(false),
    },
  };
};


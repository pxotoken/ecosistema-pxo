import React, { useEffect } from 'react';
import { SessionRenewalModal } from './SessionRenewalModal';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAuthContext } from '../contexts/AuthContext';

interface SessionManagerProps {
  isAuthenticated: boolean;
  renewSession: () => Promise<void>;
  endSession: () => Promise<void>;
  children?: React.ReactNode;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  isAuthenticated,
  renewSession,
  endSession,
  children,
}) => {
  const { sessionStartTime } = useAuthContext();
  const autoRenewOnActivity = import.meta.env.VITE_AUTO_RENEW_ON_ACTIVITY !== 'false';
  const warningThreshold = parseInt(import.meta.env.VITE_SESSION_WARNING_THRESHOLD || '20');

  const sessionManager = useSessionManager({
    enabled: isAuthenticated,
    autoRenewOnActivity,
    warningThresholdSeconds: warningThreshold,
    renewSession,
    endSession,
    onSessionExpired: () => {
      console.log('🔴 Session expired - logging out user');
    },
    onRenewalRequired: () => {
      console.log('🟡 Session renewal required');
    },
  });

  // Sync session start time from auth
  useEffect(() => {
    if (sessionStartTime && isAuthenticated) {
      sessionManager.session.startSession();
    }
  }, [sessionStartTime, isAuthenticated]);

  return (
    <>
      {children}
      
      <SessionRenewalModal
        isOpen={sessionManager.session.showRenewalModal}
        remainingSeconds={sessionManager.session.remainingSeconds}
        isCriticalActivity={sessionManager.activity.isCriticalActivity}
        currentActivityType={sessionManager.activity.currentActivity?.type}
        onRenew={sessionManager.actions.renewSession}
        onLogout={sessionManager.actions.logout}
        autoRenewEnabled={autoRenewOnActivity}
        isRenewing={sessionManager.session.isRenewing}
      />
    </>
  );
};


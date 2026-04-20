import { useEffect, useState, useCallback, useRef } from 'react';

export type ActivityType = 
  | 'transaction_pending'
  | 'transaction_signing'
  | 'form_editing'
  | 'kyc_uploading'
  | 'exchange_processing'
  | 'wallet_operation'
  | 'idle';

interface Activity {
  type: ActivityType;
  startedAt: number;
  metadata?: Record<string, any>;
}

interface UseActivityDetectionOptions {
  idleTimeoutMs?: number;
  enableAutoRenewal?: boolean;
  onActivityChange?: (activity: Activity | null) => void;
  onCriticalActivity?: (activity: Activity) => void;
}

const CRITICAL_ACTIVITIES: ActivityType[] = [
  'transaction_pending',
  'transaction_signing',
  'exchange_processing',
  'wallet_operation',
];

export const useActivityDetection = (options: UseActivityDetectionOptions = {}) => {
  const {
    idleTimeoutMs = 60000,
    enableAutoRenewal = true,
    onActivityChange,
    onCriticalActivity,
  } = options;

  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCriticalActivity, setIsCriticalActivity] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startActivity = useCallback((type: ActivityType, metadata?: Record<string, any>) => {
    const activity: Activity = {
      type,
      startedAt: Date.now(),
      metadata,
    };

    setCurrentActivity(activity);
    setIsActive(true);
    setLastActivityTime(Date.now());

    const isCritical = CRITICAL_ACTIVITIES.includes(type);
    setIsCriticalActivity(isCritical);

    if (onActivityChange) {
      onActivityChange(activity);
    }

    if (isCritical && onCriticalActivity) {
      onCriticalActivity(activity);
    }

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
  }, [onActivityChange, onCriticalActivity]);

  const endActivity = useCallback((type?: ActivityType) => {
    if (type && currentActivity?.type !== type) {
      return;
    }

    setCurrentActivity(null);
    setIsCriticalActivity(false);
    setLastActivityTime(Date.now());

    if (onActivityChange) {
      onActivityChange(null);
    }
  }, [currentActivity, onActivityChange]);

  const updateActivityMetadata = useCallback((metadata: Record<string, any>) => {
    if (currentActivity) {
      setCurrentActivity({
        ...currentActivity,
        metadata: { ...currentActivity.metadata, ...metadata },
      });
    }
  }, [currentActivity]);

  const recordUserInteraction = useCallback(() => {
    setLastActivityTime(Date.now());
    setIsActive(true);

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      if (!currentActivity || currentActivity.type === 'idle') {
        setIsActive(false);
      }
    }, idleTimeoutMs);
  }, [currentActivity, idleTimeoutMs]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleUserActivity = () => {
      recordUserInteraction();
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [recordUserInteraction]);

  const shouldPreventExpiration = useCallback(() => {
    return isCriticalActivity && enableAutoRenewal;
  }, [isCriticalActivity, enableAutoRenewal]);

  return {
    currentActivity,
    isActive,
    isCriticalActivity,
    lastActivityTime,
    startActivity,
    endActivity,
    updateActivityMetadata,
    shouldPreventExpiration,
    recordUserInteraction,
  };
};


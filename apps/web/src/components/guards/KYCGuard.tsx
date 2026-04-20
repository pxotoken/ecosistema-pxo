import React, { useEffect, useRef } from 'react';
import { useToast } from '../ui/Toast';

interface KYCGuardProps {
  children: React.ReactNode;
  user: any;
  onRedirect: () => void;
}

export const KYCGuard: React.FC<KYCGuardProps> = ({ children, user, onRedirect }) => {
  const { addToast } = useToast();
  const hasShownToast = useRef(false);
  const isKYCValidated = user?.KYC_status === 'VALIDATED';

  useEffect(() => {
    if (!isKYCValidated && !hasShownToast.current) {
      hasShownToast.current = true;
      addToast({
        type: 'info',
        title: 'KYC Verification Required',
        description: 'Complete your KYC verification in Settings to access this feature.',
        duration: 6000,
      });
      onRedirect();
    }
  }, [isKYCValidated, addToast, onRedirect]);

  if (!isKYCValidated) {
    return null;
  }

  return <>{children}</>;
};

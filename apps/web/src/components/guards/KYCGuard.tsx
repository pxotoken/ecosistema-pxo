import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui/Toast';
import { useAuthContext } from '../../contexts/AuthContext';
import { PATHS } from '../../routes/paths';

interface KYCGuardProps {
  children: React.ReactNode;
}

export const KYCGuard: React.FC<KYCGuardProps> = ({ children }) => {
  const { user } = useAuthContext();
  const { addToast } = useToast();
  const navigate = useNavigate();
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
      navigate(PATHS.dashboard.settings);
    }
  }, [isKYCValidated, addToast, navigate]);

  if (!isKYCValidated) return null;

  return <>{children}</>;
};

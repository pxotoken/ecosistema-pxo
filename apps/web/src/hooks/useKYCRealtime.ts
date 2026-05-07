import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { KYCStatus } from '@pxo/shared/types';

const useKYCRealtime = (userId: string | undefined, kycStatus: KYCStatus | undefined, onUpdate: () => void) => {
  useEffect(() => {
    if (!userId || kycStatus !== KYCStatus.VALIDATING) return;

    const channel = supabase
      .channel(`kyc-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { KYC_status?: string })?.KYC_status;
          if (newStatus === KYCStatus.VALIDATED || newStatus === KYCStatus.REJECTED) {
            onUpdate();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 Realtime KYC channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, kycStatus]);
};

export default useKYCRealtime;

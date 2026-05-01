import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { SendFundsModal } from '../components/crypto/SendFundsModal';
import useWalletStore from '../store/useWalletStore';
import { PATHS } from '../routes/paths';

export function DashboardLayout() {
  const { user } = useAuthContext();
  const { setAdminMode } = useWalletStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin =
    user?.user_type?.includes('989e3702-b515-4d6e-8627-fa0142a1a88f') ||
    user?.mail === 'admin@pxo.com';

  useEffect(() => {
    setAdminMode(!!isAdmin);
  }, [isAdmin, setAdminMode]);

  const handleTransfersClick = useCallback(() => {
    if (user?.KYC_status !== 'VALIDATED') {
      addToast({
        type: 'info',
        title: 'KYC Verification Required',
        description: 'Complete your KYC verification in Settings to access Transfers.',
        duration: 6000,
      });
      navigate(PATHS.dashboard.settings);
      return;
    }
    setIsSendModalOpen(true);
  }, [user, addToast, navigate]);

  return (
    <div className="min-h-screen bg-light-base dark:bg-dark-base text-light-text dark:text-dark-text font-editorial transition-colors duration-300">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-lime-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="flex h-screen relative">
        <Sidebar
          user={user}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          onTransfersClick={handleTransfersClick}
        />

        <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
          <TopBar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

          <div className="flex-1 overflow-auto pb-20">
            <div className="p-4 lg:p-8 max-w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <SendFundsModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  );
}

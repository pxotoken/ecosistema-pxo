import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { MainFooter } from '../components/MainFooter';
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

  // The sidebar is the primary navigation on every dashboard screen: a drawer
  // behind the hamburger below `lg`, a persistent rail from `lg` up.

  // Close any open mobile drawer when route changes.
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    <div className="min-h-screen bg-light-base dark:bg-dark-base text-light-text dark:text-dark-text font-editorial transition-colors duration-300 flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-lime-accent/3 rounded-full blur-3xl" />
      </div>

      <TopBar onToggleMobileMenu={() => setIsMobileMenuOpen((v) => !v)} />

      <div className="flex-1 flex min-w-0 relative">
        <Sidebar
          user={user}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          onTransfersClick={handleTransfersClick}
        />

        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          <div className="p-4 lg:p-8 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <MainFooter />

      <SendFundsModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  );
}

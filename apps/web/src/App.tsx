import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WalletOverview } from './components/WalletOverview';
import { TransactionTimeline } from './components/TransactionTimeline';
import { ExchangeRates } from './components/ExchangeRates';
import { TransactionHistory } from './components/TransactionHistory';
import { ProductSection } from './components/ProductSection';
import { KYCSettings } from './components/settings/KYCSettings';
import { KycAdminPage } from './components/kyc/KycAdminPage';
import { UserAdminPage } from './components/admin/UserAdminPage';
import { WalletStatusPage } from './components/admin/WalletStatusPage';
import { PricingRulesAdminPage } from './components/admin/PricingRulesAdminPage';
import { SessionManager } from './components/SessionManager';
import { KYCGuard } from './components/guards/KYCGuard';
import { getThirdwebClient } from './lib/client';
import useWalletStore from './store/useWalletStore';
import { useNavigationSync } from './hooks/useNavigationSync';
import { SendFundsModal } from './components/crypto/SendFundsModal';

const client = getThirdwebClient();

function AppInner() {
  console.log("🔄 AppInner component rendering");
  const { activeSection, navigateToSection } = useNavigationSync();
  const { currentChains, tokens, setAdminMode } = useWalletStore();
  const { addToast } = useToast();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  
  const { isAuthenticated, user, login, logout } = useAuthContext();

  const isAdmin = user?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") || 
                  user?.mail === "admin@pxo.com";

  useEffect(() => {
    setAdminMode(!!isAdmin);
  }, [isAdmin, setAdminMode]);

  useEffect(() => {
    console.log("🔍 Authentication state changed:", {
      isAuthenticated,
      user: user ? 'User loaded' : 'No user'
    });
  }, [isAuthenticated, user]);

  // Handle navigation from modal
  useEffect(() => {
    const handleNavigateToSection = (event: CustomEvent) => {
      const { section } = event.detail;
      console.log("🔍 Navigating to section from modal:", section);
      navigateToSection(section);
    };

    window.addEventListener('navigateToSection', handleNavigateToSection as EventListener);
    
    return () => {
      window.removeEventListener('navigateToSection', handleNavigateToSection as EventListener);
    };
  }, [navigateToSection]);

  const handleSend = () => {
    setIsSendModalOpen(true);
  };

  const handleSectionChange = (section: string) => {
    if (section === 'transfers') {
      // Validar KYC antes de abrir el modal de transfers
      if (user?.KYC_status !== 'VALIDATED') {
        addToast({
          type: 'info',
          title: 'KYC Verification Required',
          description: 'Complete your KYC verification in Settings to access Transfers.',
          duration: 6000,
        });
        navigateToSection('settings');
        return;
      }
      handleSend();
      return;
    }
    navigateToSection(section);
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'wallet':
        return (
          <div className="space-y-8">
            <WalletOverview />
            <TransactionTimeline onNavigateToHistory={() => navigateToSection('insights')} />
          </div>
        );
      case 'exchange':
        return (
          <KYCGuard user={user} onRedirect={() => navigateToSection('settings')}>
            <ExchangeRates />
          </KYCGuard>
        );
      case 'products':
        return <ProductSection />;
      case 'transfers':
        return (
          <div className="flex items-center justify-center h-96">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text font-editorial mb-4">International Transfers</h2>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">Coming soon - Send money globally with animated journey tracking</p>
            </motion.div>
          </div>
        );
      case 'insights':
        return (
          <TransactionHistory />
        );
      case 'settings':
        return <KYCSettings />;
      case 'admin-kyc':
        return <KycAdminPage />;
      case 'admin-users':
        return <UserAdminPage />;
      case 'admin-wallet-status':
        return <WalletStatusPage />;
      case 'admin-pricing-rules':
        return <PricingRulesAdminPage />;
      default:
        return <WalletOverview />;
    }
  };

  console.log("🔍 App render - isAuthenticated:", isAuthenticated, "user:", user);
  
  if (!isAuthenticated) {
    console.log("📄 Rendering LandingPage");
    return <LandingPage />;
  }

  console.log("🎯 Rendering Dashboard - User is authenticated!");

  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionManager
          isAuthenticated={isAuthenticated}
          renewSession={async () => login()}
          endSession={async () => logout()}
        >
          <AppContent 
            activeSection={activeSection} 
            navigateToSection={navigateToSection} 
            renderMainContent={renderMainContent}
            onSectionChange={handleSectionChange}
            user={user}
          />
          <SendFundsModal
            isOpen={isSendModalOpen}
            onClose={() => setIsSendModalOpen(false)}
          />
        </SessionManager>
      </ToastProvider>
    </ThemeProvider>
  );
}

const AppContent: React.FC<{
  activeSection: string;
  navigateToSection: (section: string) => void;
  renderMainContent: () => React.ReactNode;
  onSectionChange: (section: string) => void;
  user: any;
}> = ({ activeSection, navigateToSection, renderMainContent, onSectionChange, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-light-base dark:bg-dark-base text-light-text dark:text-dark-text font-editorial transition-colors duration-300">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime-accent/5 dark:bg-lime-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-lime-accent/3 dark:bg-lime-accent/3 rounded-full blur-3xl"></div>
      </div>

      <div className="flex h-screen relative">
        {/* Sidebar */}
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={onSectionChange} 
          user={user}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
          <TopBar 
            onNavigateToSection={navigateToSection}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
          
          {/* Content Area */}
          <div className="flex-1 overflow-auto pb-20">
            <div className="p-4 lg:p-8 max-w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {renderMainContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App component with AuthProvider
function App() {
  const handleLoginSuccess = () => {
    console.log("🎉 Login successful, user authenticated");
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider onLoginSuccess={handleLoginSuccess}>
          <AppInner />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
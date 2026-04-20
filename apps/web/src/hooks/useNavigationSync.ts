import { useState, useEffect, useCallback } from 'react';
import { isValidDashboardSection, getDashboardRoute } from '../config/routes';

interface NavigationState {
  activeSection: string;
  navigateToSection: (section: string) => void;
  navigateToDashboard: () => void;
  getCurrentSection: () => string;
}

const DEFAULT_SECTION = 'wallet';

export const useNavigationSync = (): NavigationState => {
  const [activeSection, setActiveSection] = useState<string>(DEFAULT_SECTION);

  // Get current section from URL
  const getCurrentSection = useCallback((): string => {
    const path = window.location.pathname;
    
    // Handle dashboard routes
    if (path.startsWith('/dashboard/')) {
      const section = path.split('/')[2];
      if (section && isValidDashboardSection(section)) {
        return section;
      }
    }
    
    // Handle root dashboard route
    if (path === '/dashboard' || path === '/dashboard/') {
      return DEFAULT_SECTION;
    }
    
    return DEFAULT_SECTION;
  }, []);

  // Initialize section from URL on mount
  useEffect(() => {
    const sectionFromUrl = getCurrentSection();
    if (sectionFromUrl !== activeSection) {
      setActiveSection(sectionFromUrl);
    }
  }, [getCurrentSection, activeSection]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const sectionFromUrl = getCurrentSection();
      setActiveSection(sectionFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getCurrentSection]);

  // Navigate to a specific section
  const navigateToSection = useCallback((section: string) => {
    if (!isValidDashboardSection(section)) {
      console.warn(`Invalid section: ${section}`);
      return;
    }

    setActiveSection(section);
    
    // Update URL without triggering page reload
    const newUrl = getDashboardRoute(section);
    window.history.pushState(null, '', newUrl);
    
    // Update document title
    const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ');
    document.title = `${sectionTitle} - PXO Dashboard`;
  }, []);

  // Navigate to dashboard root
  const navigateToDashboard = useCallback(() => {
    setActiveSection(DEFAULT_SECTION);
    window.history.pushState(null, '', '/dashboard');
    document.title = 'PXO Dashboard';
  }, []);

  return {
    activeSection,
    navigateToSection,
    navigateToDashboard,
    getCurrentSection
  };
};

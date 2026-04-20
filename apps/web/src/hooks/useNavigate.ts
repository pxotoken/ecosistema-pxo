import { useCallback } from 'react';
import { isValidDashboardSection, getDashboardRoute } from '../config/routes';

/**
 * Custom navigation hook similar to React Router's useNavigate
 * Works with the app's section-based navigation system
 */
export const useNavigate = () => {
  const navigate = useCallback((section: string) => {
    if (!isValidDashboardSection(section)) {
      console.warn(`Invalid section: ${section}`);
      return;
    }

    // Dispatch navigation event for components that listen to it
    window.dispatchEvent(new CustomEvent('navigateToSection', {
      detail: { section }
    }));
    
    // Update URL without triggering page reload
    const newUrl = getDashboardRoute(section);
    window.history.pushState(null, '', newUrl);
    
    // Update document title
    const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ');
    document.title = `${sectionTitle} - PXO Dashboard`;
  }, []);

  return navigate;
};

import { useEffect, useCallback } from 'react';
import { isValidLandingSection } from '../config/routes';

interface LandingNavigationState {
  scrollToSection: (sectionId: string) => void;
  handleAnchorClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const useLandingNavigation = (): LandingNavigationState => {
  
  // Smooth scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 96; // Height of fixed header
      const elementPosition = element.offsetTop - headerHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
      
      // Update URL hash
      window.history.pushState(null, '', `#${sectionId}`);
    }
  }, []);

  // Handle anchor clicks
  const handleAnchorClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const href = event.currentTarget.getAttribute('href');
    
    if (href?.startsWith('#')) {
      const sectionId = href.substring(1);
      if (isValidLandingSection(sectionId)) {
        scrollToSection(sectionId);
      }
    }
  }, [scrollToSection]);

  // Handle initial hash on page load
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && isValidLandingSection(hash)) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        scrollToSection(hash);
      }, 100);
    }
  }, [scrollToSection]);

  // Handle browser back/forward for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash && isValidLandingSection(hash)) {
        scrollToSection(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [scrollToSection]);

  return {
    scrollToSection,
    handleAnchorClick
  };
};

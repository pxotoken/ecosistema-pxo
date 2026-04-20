// Route configuration for PXO application
export const ROUTES = {
  // Landing page routes
  LANDING: {
    ROOT: '/',
    HERO: '/#hero',
    ABOUT: '/#que-es-pxo',
    HOW_IT_WORKS: '/#como-funciona',
    BENEFITS: '/#beneficios',
    CONTACT: '/#contacto',
  },
  
  // Dashboard routes
  DASHBOARD: {
    ROOT: '/dashboard',
    WALLET: '/dashboard/wallet',
    EXCHANGE: '/dashboard/exchange',
    PRODUCTS: '/dashboard/products',
    TRANSFERS: '/dashboard/transfers',
    HISTORY: '/dashboard/insights',
    SETTINGS: '/dashboard/settings',
    ADMIN_KYC: '/dashboard/admin-kyc',
    ADMIN_USERS: '/dashboard/admin-users',
    ADMIN_WALLET_STATUS: '/dashboard/admin-wallet-status',
    ADMIN_PRICING_RULES: '/dashboard/admin-pricing-rules',
  },
  
  // API routes
  API: {
    BASE: '/api',
    AUTH: '/api/auth',
    USERS: '/api/users',
    EXCHANGE: '/api/exchange',
    KYC: '/api/kyc',
  }
} as const;

// Valid dashboard sections
export const DASHBOARD_SECTIONS = [
  'wallet',
  'exchange', 
  'products',
  'transfers',
  'insights',
  'settings',
  'admin-kyc',
  'admin-users',
  'admin-wallet-status',
  'admin-pricing-rules'
] as const;

// Valid landing sections
export const LANDING_SECTIONS = [
  'hero',
  'que-es-pxo',
  'como-funciona', 
  'beneficios',
  'contacto'
] as const;

// Type definitions
export type DashboardSection = typeof DASHBOARD_SECTIONS[number];
export type LandingSection = typeof LANDING_SECTIONS[number];

// Helper functions
export const isValidDashboardSection = (section: string): section is DashboardSection => {
  return DASHBOARD_SECTIONS.includes(section as DashboardSection);
};

export const isValidLandingSection = (section: string): section is LandingSection => {
  return LANDING_SECTIONS.includes(section as LandingSection);
};

export const getDashboardRoute = (section: DashboardSection): string => {
  return `/dashboard/${section}`;
};

export const getLandingRoute = (section: LandingSection): string => {
  return `/#${section}`;
};


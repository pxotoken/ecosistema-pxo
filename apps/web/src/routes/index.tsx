import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '../components/LandingPage';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { WalletSection } from '../components/WalletSection';
import { ExchangeRates } from '../components/ExchangeRates';
import { TransactionHistory } from '../components/TransactionHistory';
import { ProductSection } from '../components/ProductSection';
import { KYCSettings } from '../components/settings/KYCSettings';
import { FiatPage } from '../components/fiat/FiatPage';
import { KycAdminPage } from '../components/kyc/KycAdminPage';
import { UserAdminPage } from '../components/admin/UserAdminPage';
import { WalletStatusPage } from '../components/admin/WalletStatusPage';
import { PricingRulesAdminPage } from '../components/admin/PricingRulesAdminPage';
import { KYCGuard } from '../components/guards/KYCGuard';
import { RequireAuth } from './RequireAuth';
import { RequireGuest } from './RequireGuest';
import { PATHS } from './paths';

const DASHBOARD_ROUTES = [
  { path: PATHS.dashboard.wallet, element: <WalletSection /> },
  {
    path: PATHS.dashboard.exchange,
    element: (
      <KYCGuard>
        <ExchangeRates />
      </KYCGuard>
    ),
  },
  { path: PATHS.dashboard.fiat, element: (
    <KYCGuard>
      <FiatPage />
    </KYCGuard>
  ) },
  { path: PATHS.dashboard.products, element: <ProductSection /> },
  { path: PATHS.dashboard.insights, element: <TransactionHistory /> },
  { path: PATHS.dashboard.settings, element: <KYCSettings /> },
  { path: PATHS.dashboard.adminKyc, element: <KycAdminPage /> },
  { path: PATHS.dashboard.adminUsers, element: <UserAdminPage /> },
  { path: PATHS.dashboard.adminWalletStatus, element: <WalletStatusPage /> },
  { path: PATHS.dashboard.adminPricingRules, element: <PricingRulesAdminPage /> },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path={PATHS.home} element={<LandingPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path={PATHS.dashboard.root} element={<DashboardLayout />}>
          <Route index element={<Navigate to={PATHS.dashboard.wallet} replace />} />
          {DASHBOARD_ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
          <Route path="*" element={<Navigate to={PATHS.dashboard.wallet} replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={PATHS.home} replace />} />
    </Routes>
  );
}

import type { Wallet } from 'thirdweb';

type AuthUser = {
  auth_provider_class?: string | null;
  auth_provider?: string | null;
} | null | undefined;

// Thirdweb in-app (custodial) wallet IDs — no enum exported by the SDK
const CUSTODIAL_WALLET_IDS = new Set(['embedded', 'inApp']);

export function isNonCustodialWallet(wallet: Wallet | undefined): boolean {
  if (!wallet) return false;
  return !CUSTODIAL_WALLET_IDS.has(wallet.id);
}

export function isExternalAuthProvider(user: AuthUser, wallet: Wallet | undefined): boolean {
  if (user?.auth_provider_class === 'in_app_wallet') return false;
  if (user?.auth_provider_class === 'external_wallet') return true;
  return isNonCustodialWallet(wallet);
}

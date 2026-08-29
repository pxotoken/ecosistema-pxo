import type { Wallet } from 'thirdweb/wallets';

export function isEmbeddedThirdwebWallet(wallet: Wallet | undefined): boolean {
  if (!wallet?.id) return false;
  const id = wallet.id.toLowerCase();
  return id.includes('embedded') || id.includes('inapp');
}

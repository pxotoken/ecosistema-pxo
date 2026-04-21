import { env } from '../config/env.js';

type QueryByWallet = { queryBy: 'walletAddress'; walletAddress: string };
type QueryByEmail = { queryBy: 'email'; email: string };
type QueryByPhone = { queryBy: 'phone'; phone: string };
export type InAppWalletQuery = QueryByWallet | QueryByEmail | QueryByPhone;

export interface LinkedAccount {
  provider?: string;
  type?: string;
  linkedAccountType?: string;
  details?: {
    email?: string;
    provider?: string;
    type?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface InAppWalletInfo {
  userId?: string;
  email?: string;
  linkedAccounts?: LinkedAccount[];
  [k: string]: unknown;
}

export async function fetchInAppWalletMetadataFromThirdweb(
  args: InAppWalletQuery,
): Promise<InAppWalletInfo[]> {
  const url = new URL('https://embedded-wallet.thirdweb.com/api/2023-11-30/embedded-wallet/user-details');
  if (args.queryBy === 'walletAddress') {
    url.searchParams.set('queryBy', 'walletAddress');
    url.searchParams.set('walletAddress', args.walletAddress);
  } else if (args.queryBy === 'email') {
    url.searchParams.set('queryBy', 'email');
    url.searchParams.set('email', args.email);
  } else if (args.queryBy === 'phone') {
    url.searchParams.set('queryBy', 'phone');
    url.searchParams.set('phone', args.phone);
  }

  const response = await fetch(url.href, {
    headers: { Authorization: `Bearer ${env.THIRDWEB_SECRET_KEY}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error fetching Thirdweb wallet metadata: ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as InAppWalletInfo[];
}

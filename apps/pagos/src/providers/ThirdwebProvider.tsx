import type { ReactNode } from 'react';
import { ThirdwebProvider as ThirdwebProviderBase } from 'thirdweb/react';

export function ThirdwebProvider({ children }: { children: ReactNode }) {
  return <ThirdwebProviderBase>{children}</ThirdwebProviderBase>;
}

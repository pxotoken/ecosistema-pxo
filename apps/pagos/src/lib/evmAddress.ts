import { getAddress } from 'viem';

export function toChecksumAddress(address: string): `0x${string}` {
  return getAddress(address.trim() as `0x${string}`);
}

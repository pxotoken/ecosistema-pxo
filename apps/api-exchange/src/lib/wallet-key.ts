import { env } from '../config/env.js';
import { decrypt } from './crypto/encrypter.js';

let cachedWalletKey: string | null = null;

function extractCiphertext(encryptedData: string): string {
  try {
    const parsed = JSON.parse(encryptedData);
    if (parsed?.ciphertext) return parsed.ciphertext as string;
    return encryptedData;
  } catch {
    return encryptedData;
  }
}

export async function getDecryptedWalletKey(): Promise<string> {
  if (cachedWalletKey) return cachedWalletKey;

  const { WALLET_PRIVATE_KEY_ENCRYPTED, WALLET_PRIVATE_KEY, ENCRYPTER_PRIVATE_KEY } = env;

  if (!WALLET_PRIVATE_KEY_ENCRYPTED && !WALLET_PRIVATE_KEY) {
    throw new Error(
      'WALLET_PRIVATE_KEY not configured. Provide WALLET_PRIVATE_KEY (plain) or WALLET_PRIVATE_KEY_ENCRYPTED with ENCRYPTER_PRIVATE_KEY',
    );
  }

  if (WALLET_PRIVATE_KEY_ENCRYPTED && ENCRYPTER_PRIVATE_KEY) {
    try {
      const ciphertext = extractCiphertext(WALLET_PRIVATE_KEY_ENCRYPTED);
      cachedWalletKey = decrypt(ciphertext, ENCRYPTER_PRIVATE_KEY);
      return cachedWalletKey;
    } catch (error) {
      throw new Error(`Failed to decrypt WALLET_PRIVATE_KEY: ${(error as Error).message}`);
    }
  }

  if (WALLET_PRIVATE_KEY) {
    cachedWalletKey = WALLET_PRIVATE_KEY;
    return cachedWalletKey;
  }

  throw new Error(
    'WALLET_PRIVATE_KEY configuration incomplete. Provide plain key or encrypted key with ENCRYPTER_PRIVATE_KEY',
  );
}

export function clearWalletKeyCache(): void {
  cachedWalletKey = null;
}

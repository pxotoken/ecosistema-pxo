import { decrypt } from './encrypter.js';

let cachedWalletKey = null;
let cacheInitialized = false;

function extractCiphertext(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return encryptedData;
  }

  try {
    const parsed = JSON.parse(encryptedData);
    if (parsed.ciphertext) {
      return parsed.ciphertext;
    }
    return encryptedData;
  } catch {
    return encryptedData;
  }
}

async function decryptWalletKey() {
  if (cacheInitialized && cachedWalletKey !== null) {
    return cachedWalletKey;
  }

  const masterKey = process.env.ENCRYPTER_PRIVATE_KEY;
  const encryptedKey = process.env.WALLET_PRIVATE_KEY_ENCRYPTED;
  const plainKey = process.env.WALLET_PRIVATE_KEY;

  if (!masterKey && !encryptedKey && !plainKey) {
    throw new Error('WALLET_PRIVATE_KEY not configured. Provide either WALLET_PRIVATE_KEY (plain) or WALLET_PRIVATE_KEY_ENCRYPTED with ENCRYPTER_PRIVATE_KEY');
  }

  if (encryptedKey && masterKey) {
    try {
      const ciphertext = extractCiphertext(encryptedKey);
      cachedWalletKey = decrypt(ciphertext, masterKey);
      cacheInitialized = true;
      return cachedWalletKey;
    } catch (error) {
      throw new Error(`Failed to decrypt WALLET_PRIVATE_KEY: ${error.message}`);
    }
  }

  if (plainKey) {
    cachedWalletKey = plainKey;
    cacheInitialized = true;
    return cachedWalletKey;
  }

  throw new Error('WALLET_PRIVATE_KEY configuration incomplete. Provide either plain key or encrypted key with ENCRYPTER_PRIVATE_KEY');
}

export async function getDecryptedWalletKey() {
  return decryptWalletKey();
}

export function clearWalletKeyCache() {
  cachedWalletKey = null;
  cacheInitialized = false;
}


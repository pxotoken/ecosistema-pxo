import crypto from 'node:crypto';

function formatPrivateKey(key: string): string {
  if (typeof key !== 'string') {
    throw new Error('Private key must be a string');
  }

  let formattedKey = key.trim().replace(/\\n/g, '\n');

  if (formattedKey.includes('-----BEGIN')) {
    const beginMatch = formattedKey.match(/-----BEGIN[^-]+-----/);
    const endMatch = formattedKey.match(/-----END[^-]+----/);

    if (beginMatch && endMatch && beginMatch.index !== undefined && endMatch.index !== undefined) {
      let header = beginMatch[0];
      let footer = endMatch[0];

      if (!header.endsWith('-----')) header = header.replace(/-+$/, '') + '-----';
      if (!footer.endsWith('-----')) footer = footer.replace(/-+$/, '') + '-----';

      const bodyStart = beginMatch.index + beginMatch[0].length;
      const bodyEnd = endMatch.index;
      let body = formattedKey.substring(bodyStart, bodyEnd).trim().replace(/\s+/g, '');
      const lines = body.match(/.{1,64}/g) || [body];

      formattedKey = `${header}\n${lines.join('\n')}\n${footer}`;
    }
  }

  if (!formattedKey.includes('-----BEGIN')) {
    const cleanKey = formattedKey.replace(/\s+/g, '');
    const lines = cleanKey.match(/.{1,64}/g) || [cleanKey];
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  return formattedKey;
}

function parsePrivateKey(privateKeyPem: string): crypto.KeyObject {
  const formatted = formatPrivateKey(privateKeyPem);
  const attempts: Array<{ format: 'pem'; type: 'pkcs8' | 'pkcs1' }> = [
    { format: 'pem', type: 'pkcs8' },
    { format: 'pem', type: 'pkcs1' },
  ];

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      return crypto.createPrivateKey({ key: formatted, ...attempt });
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new Error(
    `Invalid private key format. Tried PKCS8 and PKCS1 formats. ` +
      `Please verify that ENCRYPTER_PRIVATE_KEY is a valid RSA private key in PEM format. ` +
      `Error: ${lastError?.message || 'Unknown error'}`,
  );
}

export function decrypt(encryptedData: string, privateKeyPem: string): string {
  if (!encryptedData || !privateKeyPem) {
    throw new Error('Both encryptedData and privateKey are required');
  }

  try {
    const privateKey = parsePrivateKey(privateKeyPem);
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    const decrypted = crypto.privateDecrypt(
      { key: privateKey, oaepHash: 'sha256' },
      encryptedBuffer,
    );

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
}

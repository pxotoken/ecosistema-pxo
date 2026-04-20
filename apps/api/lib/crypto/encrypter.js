import crypto from 'node:crypto';

const ALGORITHM = 'rsa-oaep-sha256';

function formatPrivateKey(key) {
  if (typeof key !== 'string') {
    throw new Error('Private key must be a string');
  }

  let formattedKey = key.trim();

  formattedKey = formattedKey.replace(/\\n/g, '\n');

  if (formattedKey.includes('-----BEGIN')) {
    const beginMatch = formattedKey.match(/-----BEGIN[^-]+-----/);
    const endMatch = formattedKey.match(/-----END[^-]+----/);
    
    if (beginMatch && endMatch && beginMatch.index !== undefined && endMatch.index !== undefined) {
      let header = beginMatch[0];
      let footer = endMatch[0];
      
      if (!header.endsWith('-----')) {
        header = header.replace(/-+$/, '') + '-----';
      }
      if (!footer.endsWith('-----')) {
        footer = footer.replace(/-+$/, '') + '-----';
      }
      
      const bodyStart = beginMatch.index + beginMatch[0].length;
      const bodyEnd = endMatch.index;
      let body = formattedKey.substring(bodyStart, bodyEnd).trim();
      
      body = body.replace(/\s+/g, '');
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

function parsePrivateKey(privateKeyPem) {
  const formatted = formatPrivateKey(privateKeyPem);
  
  const attempts = [
    { format: 'pem', type: 'pkcs8' },
    { format: 'pem', type: 'pkcs1' },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return crypto.createPrivateKey({
        key: formatted,
        ...attempt,
      });
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw new Error(
    `Invalid private key format. Tried PKCS8 and PKCS1 formats. ` +
    `Please verify that ENCRYPTER_PRIVATE_KEY is a valid RSA private key in PEM format. ` +
    `Error: ${lastError?.message || 'Unknown error'}`
  );
}

export function encrypt(plaintext, publicKeyPem) {
  if (!plaintext || !publicKeyPem) {
    throw new Error('Both plaintext and publicKey are required');
  }

  try {
    let formattedPublicKey = publicKeyPem.trim();

    if (!formattedPublicKey.includes('-----BEGIN')) {
      if (formattedPublicKey.includes('\\n')) {
        formattedPublicKey = formattedPublicKey.replace(/\\n/g, '\n');
      }
      
      if (!formattedPublicKey.includes('-----BEGIN')) {
        formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${formattedPublicKey}\n-----END PUBLIC KEY-----`;
      }
    }

    const publicKey = crypto.createPublicKey({
      key: formattedPublicKey,
      format: 'pem',
    });

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        oaepHash: 'sha256',
      },
      Buffer.from(plaintext, 'utf8')
    );

    return encrypted.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export function decrypt(encryptedData, privateKeyPem) {
  if (!encryptedData || !privateKeyPem) {
    throw new Error('Both encryptedData and privateKey are required');
  }

  try {
    const privateKey = parsePrivateKey(privateKeyPem);
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        oaepHash: 'sha256',
      },
      encryptedBuffer
    );

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

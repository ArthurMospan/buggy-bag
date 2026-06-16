import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const keyHex = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY is not set in environment variables');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return encrypted;
  
  // Fallback for plaintext tokens
  if (!encrypted.includes(':')) {
    console.warn('[crypto] Decrypting legacy plaintext token. Consider re-encrypting it.');
    return encrypted;
  }
  
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) return encrypted; // Not a valid encrypted format, maybe plaintext with colons?
    
    const [ivHex, authTagHex, ciphertextHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    console.error('[crypto] Decryption failed, falling back to plaintext:', error);
    return encrypted;
  }
}

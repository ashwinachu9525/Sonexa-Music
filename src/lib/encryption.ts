import CryptoJS from 'crypto-js';

// Fallback key, but ideally use an environment variable like process.env.ENCRYPTION_KEY
// Must be exactly 32 bytes (256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'SonexaMusicSecureKey123456789012';

export function decryptPayload(encryptedBase64: string): string {
    try {
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error('Failed to decrypt payload', e);
        return '';
    }
}

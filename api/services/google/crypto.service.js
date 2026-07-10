import crypto from 'crypto';
import CONFIG from '../../config/config.js';

/**
 * Cifrado del refresh token de Google con AES-256-GCM.
 * Formato en DB: "iv.tag.ciphertext" (cada parte en base64, IV aleatorio de 12 bytes).
 */

const getKey = () => {
    const key = Buffer.from(CONFIG.TOKEN_ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
        throw new Error('TOKEN_ENCRYPTION_KEY inválida: se esperan 32 bytes en hex (64 caracteres). Corré `make env`.');
    }
    return key;
};

export const encrypt = (plainText) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((b) => b.toString('base64')).join('.');
};

export const decrypt = (payload) => {
    const [iv, tag, encrypted] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

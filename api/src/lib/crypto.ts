/**
 * Field-level encryption for secrets at rest (AES-256-GCM).
 * Used for TOTP secrets. A TOTP secret is a second authentication factor: read
 * out of the database it lets an attacker mint valid codes forever, so it must
 * not sit in plaintext next to the password hash it is supposed to back up.
 * GCM is authenticated, so tampering fails decryption rather than silently
 * yielding a wrong plaintext. The IV is random per encryption and stored with
 * the ciphertext — encryption here is deliberately non-deterministic, because
 * these values are never looked up by their content, only read back by id.
 */
import crypto from 'crypto';
import { config } from '@/lib/config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits — the GCM standard nonce length
const KEY = Buffer.from(config.totp.encryptionKey, 'hex');

/** Encrypt to a self-contained `iv:authTag:ciphertext` string, all base64. */
export function encryptSecret(plaintext: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':');
}

/**
 * Reverse `encryptSecret`. Throws when the payload is malformed or the auth tag
 * does not verify — a corrupted or tampered secret must fail loudly rather than
 * decrypt to garbage that then fails a TOTP check for no visible reason.
 */
export function decryptSecret(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error('Malformed encrypted payload');

    const [ivPart, tagPart, dataPart] = parts as [string, string, string];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivPart, 'base64'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8');
}

/** SHA-256 hex digest — for tokens at rest, where the client holds the plaintext. */
export function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

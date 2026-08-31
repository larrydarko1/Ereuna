import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, sha256 } from '@/lib/crypto.js';

describe('encryptSecret / decryptSecret', () => {
    it('round-trips a TOTP secret', () => {
        const secret = 'JBSWY3DPEHPK3PXP';
        expect(decryptSecret(encryptSecret(secret))).toBe(secret);
    });

    it('produces a different ciphertext each time (random IV)', () => {
        expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
    });

    it('rejects a tampered ciphertext instead of returning wrong plaintext', () => {
        const [iv, tag, data] = encryptSecret('secret').split(':') as [string, string, string];
        const flipped = data.startsWith('A') ? `B${data.slice(1)}` : `A${data.slice(1)}`;
        expect(() => decryptSecret([iv, tag, flipped].join(':'))).toThrow();
    });

    it('rejects a malformed payload', () => {
        expect(() => decryptSecret('not-a-payload')).toThrow('Malformed encrypted payload');
    });
});

describe('sha256', () => {
    it('is a stable 64-char hex digest', () => {
        expect(sha256('token')).toMatch(/^[0-9a-f]{64}$/);
        expect(sha256('token')).toBe(sha256('token'));
    });
});

import { describe, expect, it } from 'vitest';
import { REDACT_PATHS } from '#config/redact.js';

describe('REDACT_PATHS', () => {
    it('has no duplicates — pino throws on a repeated path', () => {
        expect(new Set(REDACT_PATHS).size).toBe(REDACT_PATHS.length);
    });

    it.each(['password', 'accessToken', 'refreshToken', 'totpSecret', 'recoveryCodes', 'authorization', 'cookie'])(
        'redacts `%s`',
        (path) => {
            expect(REDACT_PATHS).toContain(path);
        },
    );

    it('covers the request and response header carriers, not just the bare names', () => {
        expect(REDACT_PATHS).toContain('req.headers.authorization');
        expect(REDACT_PATHS).toContain('req.headers.cookie');
        expect(REDACT_PATHS).toContain('res.headers["set-cookie"]');
    });

    it('wildcards the three that appear nested under arbitrary keys', () => {
        expect(REDACT_PATHS.filter((p) => p.startsWith('*.'))).toEqual(['*.password', '*.token', '*.totpSecret']);
    });
});

import { describe, expect, it } from 'vitest';
import { config } from '@/lib/config.js';

/**
 * The schema runs once, at import, against the real `process.env` — which is
 * what "validated ONCE here" means and why there is nothing to re-parse. These
 * assertions are on the assembled shape and the invariants other modules rely
 * on, not on Zod's own behaviour.
 */
describe('config', () => {
    it('reports the test environment as both test and non-production', () => {
        expect(config.isTest).toBe(true);
        expect(config.isDev).toBe(true);
    });

    it('trusts a hop count and never `true` — a client could otherwise spoof its own ip', () => {
        expect(typeof config.trustProxyHops).toBe('number');
        expect(config.trustProxyHops).toBeGreaterThanOrEqual(0);
    });

    it('allows exactly one frontend origin, as an absolute url', () => {
        expect(() => new URL(config.corsOrigin)).not.toThrow();
    });

    it('carries the secrets the test bootstrap seeds', () => {
        expect(config.jwt.secret.length).toBeGreaterThanOrEqual(32);
        expect(config.totp.encryptionKey).toMatch(/^[0-9a-f]{64}$/);
    });

    it('keeps the access token far shorter-lived than the refresh cookie', () => {
        expect(config.jwt.accessTokenExpiry).toBe('15m');
        expect(config.jwt.refreshTokenExpiry).toBe(7 * 24 * 60 * 60 * 1000);
        expect(config.jwt.twoFactorTempExpiry).toBe('5m');
    });

    it('hashes with argon2id at a cost that is not the library default', () => {
        expect(config.argon2.memoryCost).toBe(64 * 1024);
        expect(config.argon2.timeCost).toBeGreaterThan(1);
        expect(config.argon2.parallelism).toBeGreaterThan(1);
    });

    it('allows one step of TOTP drift and issues ten recovery codes', () => {
        expect(config.totp.window).toBe(1);
        expect(config.totp.recoveryCodeCount).toBe(10);
        expect(config.totp.issuer).not.toBe('');
    });

    it('gives every limit a positive ceiling', () => {
        const nonPositive = Object.entries(config.limits).filter(([, value]) => value <= 0);

        expect(nonPositive).toEqual([]);
    });

    it("caps a portfolio's positions below its trades — a trade can close a position", () => {
        expect(config.limits.positionsPerPortfolio).toBeLessThan(config.limits.tradesPerPortfolio);
    });

    it('re-fetches a price sooner while the market is open than after it closes', () => {
        expect(config.cache.priceMarketOpen).toBeLessThan(config.cache.priceMarketClosed);
    });

    it('holds reference data longest of all', () => {
        expect(config.cache.staticData).toBeGreaterThan(config.cache.userData);
        expect(config.cache.userData).toBeGreaterThan(config.cache.priceMarketClosed);
    });

    it('resolves the logo directory to an absolute path', () => {
        expect(config.logos.dir.startsWith('/')).toBe(true);
        expect(config.logos.maxAge).toBeGreaterThan(0);
    });

    it('carries a mongo and a redis target', () => {
        expect(config.mongo.uri).toMatch(/^mongodb:\/\//);
        expect(config.mongo.db).not.toBe('');
        expect(config.redis.host).not.toBe('');
        expect(Number.isInteger(config.redis.port)).toBe(true);
    });
});

import { describe, expect, it } from 'vitest';
import { config } from '@/lib/config.js';

/**
 * The schema runs once, at import, against the real `process.env`. So these
 * assertions are on the assembled shape and the invariants the loop depends on,
 * not on Zod's own behaviour.
 */
describe('config', () => {
    it('treats anything but production as development', () => {
        expect(config.isDev).toBe(process.env.NODE_ENV !== 'production');
    });

    it('carries a mongo and a redis target', () => {
        expect(config.mongo.uri).toMatch(/^mongodb:\/\//);
        expect(config.mongo.db).not.toBe('');
        expect(config.redis.host).not.toBe('');
        expect(Number.isInteger(config.redis.port)).toBe(true);
    });

    it('holds the vendor feed over a secure websocket', () => {
        expect(config.tiingo.url).toBe('wss://api.tiingo.com/iex');
        expect(config.tiingo.key).toBe('test-key');
    });

    it('bounds the handshake, so a vendor that never answers does not hold the session open', () => {
        expect(config.tiingo.handshakeTimeoutMs).toBeGreaterThan(0);
        expect(config.tiingo.thresholdLevel).toBeGreaterThan(0);
    });

    it('re-checks for a session often enough not to lose the first minutes of one', () => {
        expect(config.pollIntervalMs).toBeGreaterThan(0);
        expect(config.pollIntervalMs).toBeLessThanOrEqual(60_000);
    });

    it("serves probes on a port of its own, distinct from the worker's", () => {
        expect(config.probe.port).toBe(9092);
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/lib/config.js';

// Production also refuses the local Mongo and Redis defaults, so a production
// load sets those too and the only thing left to judge is the feed address
const PRODUCTION = { NODE_ENV: 'production', MONGO_URI: 'mongodb://db:27017', REDIS_HOST: 'redis' };

/** A fresh parse of the schema under `env`: the module reads it once, at import. */
async function loadConfig(env: Record<string, string>): Promise<typeof config> {
    vi.resetModules();
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    const fresh = await import('@/lib/config.js');
    return fresh.config;
}

afterEach(() => {
    vi.unstubAllEnvs();
});

/**
 * The schema runs once, at import, against the real `process.env`. So these
 * assertions are on the assembled shape and the invariants the loop depends on,
 * not on Zod's own behaviour.
 */
describe('config', () => {
    it('treats anything but production as development', () => {
        expect(config.isDev).toBe(process.env['NODE_ENV'] !== 'production');
    });

    it('carries a mongo and a redis target', () => {
        expect(config.mongo.uri).toMatch(/^mongodb:\/\//);
        expect(config.mongo.db).not.toBe('');
        expect(config.redis.host).not.toBe('');
        expect(Number.isInteger(config.redis.port)).toBe(true);
    });

    it('holds the vendor feed over a secure websocket', () => {
        expect(config.tiingo.url).toBe('wss://api.tiingo.com/equity/intraday');
        expect(config.tiingo.key).toBe('test-key');
    });

    it('reads a blank feed address as the real one, as an .env copied from the example has it', async () => {
        await expect(loadConfig({ TIINGO_URL: '' })).resolves.toMatchObject({
            tiingo: { url: 'wss://api.tiingo.com/equity/intraday' },
        });
    });

    it('points at a local feed simulator outside production', async () => {
        await expect(loadConfig({ TIINGO_URL: 'ws://localhost:8787' })).resolves.toMatchObject({
            tiingo: { url: 'ws://localhost:8787' },
        });
    });

    it('refuses a feed address that is not a websocket', async () => {
        await expect(loadConfig({ TIINGO_URL: 'https://api.tiingo.com/iex' })).rejects.toThrow(/TIINGO_URL/);
    });

    it('refuses an insecure feed in production, so a dev value left behind cannot feed it simulated trades', async () => {
        await expect(loadConfig({ ...PRODUCTION, TIINGO_URL: 'ws://localhost:8787' })).rejects.toThrow(
            /must be a wss:\/\/ address in production/,
        );
    });

    it('accepts a secure feed in production', async () => {
        await expect(
            loadConfig({ ...PRODUCTION, TIINGO_URL: 'wss://api.tiingo.com/equity/intraday' }),
        ).resolves.toMatchObject({ isDev: false });
    });

    it('bounds the handshake, so a vendor that never answers does not hold the session open', () => {
        expect(config.tiingo.handshakeTimeoutMs).toBeGreaterThan(0);
        expect(config.tiingo.thresholdLevel).toBeGreaterThan(0);
    });

    it('gives a shutdown long enough for the stop poll and the unsubscribe reply', () => {
        expect(config.tiingo.unsubscribeTimeoutMs).toBeGreaterThan(0);
        expect(config.shutdownTimeoutMs).toBeGreaterThan(1_000 + config.tiingo.unsubscribeTimeoutMs);
    });

    it('re-checks for a session often enough not to lose the first minutes of one', () => {
        expect(config.pollIntervalMs).toBeGreaterThan(0);
        expect(config.pollIntervalMs).toBeLessThanOrEqual(60_000);
    });

    it("serves probes on a port of its own, distinct from the worker's", () => {
        expect(config.probe.port).toBe(9092);
    });
});

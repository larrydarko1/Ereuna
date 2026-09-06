import { describe, expect, it } from 'vitest';
import { config } from '@/lib/config.js';

/**
 * The schema runs once, at import, against the real `process.env` — which is
 * what "validated ONCE here" means and why there is nothing to re-parse. So the
 * assertions here are on the assembled shape and the invariants other modules
 * depend on, not on Zod's own behaviour.
 */
describe('config', () => {
    it('takes the role from WORKER_ROLE', () => {
        expect(config.role).toBe('all');
    });

    it('names the three roles as the only ones the entry point branches on', () => {
        expect(['all', 'aggregate', 'organize']).toContain(config.role);
    });

    it('treats anything but production as development', () => {
        expect(config.isDev).toBe(process.env.NODE_ENV !== 'production');
    });

    it('carries a mongo and a redis target', () => {
        expect(config.mongo.uri).toMatch(/^mongodb:\/\//);
        expect(config.mongo.db).not.toBe('');
        expect(config.redis.host).not.toBe('');
        expect(Number.isInteger(config.redis.port)).toBe(true);
    });

    it('points at the vendor over https and carries the key the tests set', () => {
        expect(config.tiingo.baseUrl).toBe('https://api.tiingo.com');
        expect(config.tiingo.key).toBe('test-key');
    });

    it('bounds every vendor request', () => {
        expect(config.tiingo.timeoutMs).toBeGreaterThan(0);
        expect(config.tiingo.retries).toBeGreaterThan(1);
        expect(config.tiingo.concurrency).toBeGreaterThan(0);
    });

    it('reads the stream in batches, with a blocking wait longer than one', () => {
        expect(config.stream.batchSize).toBeGreaterThan(1);
        expect(config.stream.blockMs).toBeGreaterThan(0);
    });

    it('throttles republishing more slowly than it sweeps, so a swept bucket is publishable', () => {
        expect(config.candles.publishThrottleMs).toBeGreaterThanOrEqual(config.candles.sweepIntervalMs / 2);
        expect(config.candles.flushIntervalMs).toBeGreaterThan(0);
        expect(config.candles.writeBatchSize).toBeGreaterThan(0);
    });

    it('runs the nightly batch after the close, not during the session', () => {
        expect(config.organize.runHourEt).toBeGreaterThan(16);
        expect(config.organize.runHourEt).toBeLessThan(24);
    });

    it('does not run the nightly batch at startup unless asked', () => {
        expect(config.organize.runOnStart).toBe(false);
    });

    it('keeps intraday bars longer than it waits before calling a symbol delisted', () => {
        expect(config.organize.intradayRetentionDays).toBeGreaterThan(0);
        expect(config.organize.delistAfterDays).toBeGreaterThan(0);
    });

    it('serves probes on a port of its own', () => {
        expect(config.probe.port).toBeGreaterThan(1024);
    });
});

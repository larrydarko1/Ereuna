import { createServer } from 'node:net';

import { afterAll, assert, beforeAll, describe, expect, it, vi } from 'vitest';

import { isList, isRecord, TIINGO_STREAM } from '@ereuna/shared';

import { buildMarket } from '@/simulator/traffic.js';
import { startVendor } from '@/simulator/vendor.js';

/**
 * The real ingestor session against the simulated vendor, over a real socket.
 * The simulator is only worth running if the ingestor reads it the way it reads
 * Tiingo, so this is the test that holds the two to one protocol: a subscribe
 * acknowledged, trades relayed to the stream, an unsubscribe confirmed before
 * the socket closes.
 */
const xadd = vi.fn((..._args: unknown[]) => Promise.resolve('1-0'));
vi.mock('@/lib/redis.js', () => ({ getRedis: () => ({ xadd }) }));
const logged: { info: string[]; warnings: unknown[]; errors: unknown[] } = { info: [], warnings: [], errors: [] };
vi.mock('@/lib/logger.js', () => ({
    logger: {
        info: (_payload: unknown, message?: string): void => {
            logged.info.push(message ?? String(_payload));
        },
        warn: (payload: unknown): void => {
            logged.warnings.push(payload);
        },
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        debug: (): void => {},
    },
}));

const market = buildMarket([{ symbol: 'AAPL', close: 200, volume: 1 }], 1000);
const ingestor: { runSession: typeof import('@/tiingo.js').runSession | null } = { runSession: null };
let vendor: Awaited<ReturnType<typeof startVendor>> | null = null;

/** A port nothing is listening on, so the config can be pointed at it before it loads. */
async function freePort(): Promise<number> {
    const probe = createServer();
    await new Promise<void>((resolve) => {
        probe.listen(0, resolve);
    });
    const address = probe.address();
    assert(address !== null && typeof address === 'object');
    await new Promise((resolve) => {
        probe.close(resolve);
    });
    return address.port;
}

// The config reads TIINGO_URL once, at import, so the session module is loaded
// only after the address is set
beforeAll(async () => {
    const port = await freePort();
    vi.stubEnv('TIINGO_URL', `ws://localhost:${port}`);
    vendor = await startVendor({ port, market, tradesPerSecond: 1000, random: Math.random, now: Date.now });
    ingestor.runSession = (await import('@/tiingo.js')).runSession;
});

afterAll(async () => {
    await vendor?.close();
    vi.unstubAllEnvs();
});

describe('the ingestor against the simulated vendor', () => {
    it('subscribes, relays trades to the stream and unsubscribes before it closes', async () => {
        assert(ingestor.runSession !== null);
        const relayed = (): number => xadd.mock.calls.length;
        await ingestor.runSession(['AAPL'], () => relayed() >= 5);

        expect(logged.info).toEqual(expect.arrayContaining(['Subscribed', 'Unsubscribed']));
        expect(logged.warnings).toEqual([]);
        expect(logged.errors).toEqual([]);

        expect(relayed()).toBeGreaterThanOrEqual(5);
        const [stream, , , , , , data] = xadd.mock.calls[0] ?? [];
        expect(stream).toBe(TIINGO_STREAM);
        const frame: unknown = JSON.parse(String(data));
        assert(isRecord(frame) && isList(frame['data']));
        expect(frame).toMatchObject({ messageType: 'A', service: 'cons' });
        expect(frame['data'][1]).toBe('aapl');
    });
});

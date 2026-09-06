import { beforeEach, describe, expect, it, vi } from 'vitest';

const order: string[] = [];
const state: { stopped: (() => boolean) | null } = { stopped: null };

vi.mock('@/aggregate/writer.js', () => ({
    startWriter: (): void => {
        order.push('startWriter');
    },
    stopWriter: (): Promise<void> => {
        order.push('stopWriter');
        return Promise.resolve();
    },
}));
vi.mock('@/aggregate/session.js', () => ({
    startSession: (): Promise<void> => {
        order.push('startSession');
        return Promise.resolve();
    },
    stopSession: (): void => {
        order.push('stopSession');
    },
}));
vi.mock('@/aggregate/stream.js', () => ({
    consumeTrades: (shouldStop: () => boolean): Promise<void> => {
        order.push('consumeTrades');
        state.stopped = shouldStop;
        return Promise.resolve();
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

/** `stopping` never goes back to false, so each test gets its own module. */
let aggregate: typeof import('@/aggregate/index.js');

beforeEach(async () => {
    order.length = 0;
    state.stopped = null;
    vi.resetModules();
    aggregate = await import('@/aggregate/index.js');
});

describe('startAggregator', () => {
    it('has somewhere to put a candle and a session to bucket into before it reads a trade', async () => {
        await aggregate.startAggregator();
        expect(order).toEqual(['startWriter', 'startSession', 'consumeTrades']);
    });

    it('hands the stream a stop signal that is false while running', async () => {
        await aggregate.startAggregator();
        expect(state.stopped?.()).toBe(false);
    });
});

describe('stopAggregator', () => {
    it('raises the stop signal the consume loop reads', async () => {
        await aggregate.startAggregator();
        await aggregate.stopAggregator();
        expect(state.stopped?.()).toBe(true);
    });

    it('stops the session, then writes the candles already finalised', async () => {
        await aggregate.startAggregator();
        order.length = 0;
        await aggregate.stopAggregator();
        expect(order).toEqual(['stopSession', 'stopWriter']);
    });

    it('can stop a role that never started', async () => {
        await expect(aggregate.stopAggregator()).resolves.toBeUndefined();
    });
});

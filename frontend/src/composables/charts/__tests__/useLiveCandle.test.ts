import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

import type { CandlePair } from '@ereuna/shared';

import { socket } from '@/__tests__/support/socket';
import { useLiveCandle, type UseLiveCandleReturn } from '@/composables/charts/useLiveCandle';

// Imported inside the factory: `vi.mock` is hoisted above this file's imports,
// so the support module cannot be referenced from the outer scope here.
vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const candle = (close: number): Record<string, unknown> => ({
    time: '2026-03-02',
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    final: false,
});

/** Scopes still running, stopped after each test: the set of pairs is the tab's, and outlives a test that leaves one open. */
const running: (() => void)[] = [];

function inScope(
    key: () => CandlePair,
    enabled: () => boolean = () => true,
): { live: UseLiveCandleReturn; stop: () => void } {
    const scope = effectScope();
    const live = scope.run(() => useLiveCandle(key, enabled))!;
    const stop = (): void => scope.stop();
    running.push(stop);
    return { live, stop };
}

/** The pairs each candle:watch asked for, in order. */
function watches(): unknown[] {
    return socket.emitted.filter((entry) => entry.event === 'candle:watch').map((entry) => entry.payload);
}

beforeEach(() => {
    socket.reset();
});

afterEach(async () => {
    for (const stop of running.splice(0)) stop();
    await nextTick();
});

describe('subscribing', () => {
    it('asks for the pair the chart is showing', async () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await nextTick();

        expect(watches()).toEqual([{ pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] }]);
    });

    it('asks for nothing without a symbol', async () => {
        inScope(() => ({ symbol: '', timeframe: 'daily' }));
        await nextTick();

        expect(socket.emitted).toEqual([]);
    });

    it('asks for nothing while the feed is switched off', async () => {
        inScope(
            () => ({ symbol: 'AAPL', timeframe: 'daily' }),
            () => false,
        );
        await nextTick();

        expect(socket.emitted).toEqual([]);
    });

    it('replaces its own pair when the chart changes symbol, and drops the old candle', async () => {
        const symbol = ref('AAPL');
        const { live } = inScope(() => ({ symbol: symbol.value, timeframe: 'daily' }));
        socket.deliver('candle:update', { symbol: 'AAPL', timeframe: 'daily', candle: candle(10) });
        expect(live.candle.value).not.toBeNull();

        symbol.value = 'MSFT';
        await nextTick();

        expect(live.candle.value).toBeNull();
        expect(watches().at(-1)).toEqual({ pairs: [{ symbol: 'MSFT', timeframe: 'daily' }] });
    });

    // The screener charts daily over weekly: a watch per chart let the second
    // replace the first, so only one of the two ever ticked
    it('asks for every chart on the page in one message', async () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        inScope(() => ({ symbol: 'AAPL', timeframe: 'weekly' }));
        await nextTick();

        expect(watches()).toEqual([
            {
                pairs: [
                    { symbol: 'AAPL', timeframe: 'daily' },
                    { symbol: 'AAPL', timeframe: 'weekly' },
                ],
            },
        ]);
    });

    it("keeps the other chart's pair when one chart closes", async () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        const weekly = inScope(() => ({ symbol: 'AAPL', timeframe: 'weekly' }));
        await nextTick();

        weekly.stop();
        await nextTick();

        expect(watches().at(-1)).toEqual({ pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });
    });

    it('keeps a pair two charts share until the last of them closes', async () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        const second = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await nextTick();

        second.stop();
        await nextTick();

        expect(watches().at(-1)).toEqual({ pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });
    });

    it('sends an empty set when the last chart switches off, so the server leaves its rooms', async () => {
        const on = ref(true);
        inScope(
            () => ({ symbol: 'AAPL', timeframe: 'daily' }),
            () => on.value,
        );
        await nextTick();

        on.value = false;
        await nextTick();

        expect(watches().at(-1)).toEqual({ pairs: [] });
    });

    it('re-asks once after a reconnect, however many charts are open', async () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        inScope(() => ({ symbol: 'AAPL', timeframe: 'weekly' }));
        await nextTick();

        socket.deliver('connect', undefined);
        await nextTick();

        expect(watches()).toHaveLength(2);
        expect(watches()[1]).toEqual(watches()[0]);
    });
});

describe('receiving', () => {
    it('takes the bucket for the pair it is watching', () => {
        const { live } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        socket.deliver('candle:update', { symbol: 'AAPL', timeframe: 'daily', candle: candle(11) });

        expect(live.candle.value).toMatchObject({ close: 11 });
    });

    it('ignores a bucket for a symbol the chart has since left', () => {
        const { live } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        socket.deliver('candle:update', { symbol: 'MSFT', timeframe: 'daily', candle: candle(11) });

        expect(live.candle.value).toBeNull();
    });

    it('ignores a bucket for another timeframe', () => {
        const { live } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        socket.deliver('candle:update', { symbol: 'AAPL', timeframe: 'weekly', candle: candle(11) });

        expect(live.candle.value).toBeNull();
    });

    it('reports whether the socket is up', () => {
        const { live } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        expect(live.connected.value).toBe(true);
    });
});

describe('teardown', () => {
    it('unbinds both handlers, so a closed chart stops receiving', () => {
        const { stop } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        stop();

        expect(socket.listeners('candle:update')).toBe(0);
        expect(socket.listeners('connect')).toBe(0);
    });
});

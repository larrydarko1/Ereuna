import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import type { ChartTimeframe } from '@ereuna/shared';
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

function inScope(
    key: () => { symbol: string; timeframe: ChartTimeframe },
    enabled: () => boolean = () => true,
): { live: UseLiveCandleReturn; stop: () => void } {
    const scope = effectScope();
    const live = scope.run(() => useLiveCandle(key, enabled)) as UseLiveCandleReturn;
    return { live, stop: () => scope.stop() };
}

beforeEach(() => {
    socket.reset();
});

describe('subscribing', () => {
    it('asks for the pair the chart is showing', () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        expect(socket.emitted).toEqual([{ event: 'candle:watch', payload: { symbol: 'AAPL', timeframe: 'daily' } }]);
    });

    it('asks for nothing without a symbol', () => {
        inScope(() => ({ symbol: '', timeframe: 'daily' }));

        expect(socket.emitted).toEqual([]);
    });

    it('asks for nothing while the feed is switched off', () => {
        inScope(
            () => ({ symbol: 'AAPL', timeframe: 'daily' }),
            () => false,
        );

        expect(socket.emitted).toEqual([]);
    });

    it('replaces the subscription when the pair changes, and drops the old candle', async () => {
        const symbol = ref('AAPL');
        const { live } = inScope(() => ({ symbol: symbol.value, timeframe: 'daily' }));
        socket.deliver('candle:update', { symbol: 'AAPL', timeframe: 'daily', candle: candle(10) });
        expect(live.candle.value).not.toBeNull();

        symbol.value = 'MSFT';
        await nextTick();

        expect(live.candle.value).toBeNull();
        expect(socket.emitted[1]).toEqual({
            event: 'candle:watch',
            payload: { symbol: 'MSFT', timeframe: 'daily' },
        });
    });

    it('re-asks after a reconnect, because the server holds subscriptions per connection', () => {
        inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        socket.deliver('connect', undefined);

        expect(socket.emitted).toHaveLength(2);
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

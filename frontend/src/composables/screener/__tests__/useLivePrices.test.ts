import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';

import type { ScreenerResult } from '@ereuna/shared';

import { screenerResult } from '@/__tests__/support/answers';
import { socket } from '@/__tests__/support/socket';
import { useLivePrices, type UseLivePricesReturn } from '@/composables/screener/useLivePrices';

// Imported inside the factory: `vi.mock` is hoisted above this file's imports,
// so the support module cannot be referenced from the outer scope here.
vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const PAGE: ScreenerResult[] = [
    screenerResult('AAPL', { columns: { 'TimeSeries.close': 200, 'todaychange': 0.01, 'PERatio': 30 } }),
    screenerResult('MSFT', { columns: { 'TimeSeries.close': 400, 'todaychange': -0.02, 'PERatio': 35 } }),
];

function inScope(items: () => readonly ScreenerResult[], enabled: () => boolean = () => true): UseLivePricesReturn {
    return effectScope().run(() => useLivePrices(items, enabled))!;
}

beforeEach(() => {
    socket.reset();
});

describe('useLivePrices', () => {
    it('watches every symbol on the page during the session', () => {
        inScope(() => PAGE);

        expect(socket.emitted).toEqual([{ event: 'quote:watch', payload: { symbols: ['AAPL', 'MSFT'] } }]);
    });

    it('watches nothing while the session is shut', () => {
        inScope(
            () => PAGE,
            () => false,
        );

        expect(socket.emitted).toEqual([]);
    });

    it('shows the page as read until a quote moves', () => {
        expect(inScope(() => PAGE).items.value).toEqual(PAGE);
    });

    it('ticks the price, and the change in the unit the nightly run stores it in', () => {
        const live = inScope(() => PAGE);

        socket.deliver('quote:update', { quotes: { AAPL: { price: 210, changePercent: 5 } } });

        expect(live.items.value[0]?.columns).toEqual({ 'TimeSeries.close': 210, 'todaychange': 0.05, 'PERatio': 30 });
        expect(live.items.value[1]).toEqual(PAGE[1]);
    });

    it('clears the change when the server had nothing to measure it against', () => {
        const live = inScope(() => PAGE);

        socket.deliver('quote:update', { quotes: { AAPL: { price: 210, changePercent: null } } });

        expect(live.items.value[0]?.columns['todaychange']).toBeNull();
    });

    it('adds no column the table does not show', () => {
        const page = [screenerResult('AAPL', { columns: { PERatio: 30 } })];
        const live = inScope(() => page);

        socket.deliver('quote:update', { quotes: { AAPL: { price: 210, changePercent: 5 } } });

        expect(live.items.value[0]?.columns).toEqual({ PERatio: 30 });
    });
});

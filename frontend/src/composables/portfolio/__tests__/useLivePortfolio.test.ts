import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';

import type { PortfolioSummary, PortfolioValuation, ValuedPosition } from '@ereuna/shared';

import { summary as makeSummary } from '@/__tests__/support/portfolio';
import { socket } from '@/__tests__/support/socket';
import { useLivePortfolio, type UseLivePortfolioReturn } from '@/composables/portfolio/useLivePortfolio';

// Imported inside the factory: `vi.mock` is hoisted above this file's imports,
// so the support module cannot be referenced from the outer scope here.
vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const held: ValuedPosition = {
    symbol: 'AAPL',
    side: 'long',
    shares: 10,
    avgPrice: 100,
    price: 110,
    live: false,
    marketValue: 1_100,
    exposure: 1_100,
    unrealizedPL: 100,
    unrealizedPLPercent: 10,
    weight: 100,
};

const valuation = (number: number, totalValue: number): PortfolioValuation => ({
    number,
    positions: [{ ...held, price: 130, live: true }],
    longValue: 1_300,
    shortValue: 0,
    grossExposure: 1_300,
    netExposure: 1_300,
    totalValue,
    leverageUsed: null,
    buyingPower: 0,
    unrealizedPL: 300,
    totalPL: null,
    totalPLPercent: null,
});

function inScope(
    summary: () => PortfolioSummary | null,
    enabled: () => boolean = () => true,
): { live: UseLivePortfolioReturn; stop: () => void } {
    const scope = effectScope();
    const live = scope.run(() => useLivePortfolio(summary, enabled))!;
    return { live, stop: () => scope.stop() };
}

function watches(): unknown[] {
    return socket.emitted.filter((entry) => entry.event === 'portfolio:watch').map((entry) => entry.payload);
}

beforeEach(() => {
    socket.reset();
});

describe('watching', () => {
    it('asks the server to price the open slot', () => {
        inScope(() => makeSummary({ number: 3, positions: [held] }));

        expect(watches()).toEqual([{ number: 3 }]);
    });

    it('asks for nothing when the slot holds nothing', () => {
        inScope(() => makeSummary({ positions: [] }));

        expect(socket.emitted).toEqual([]);
    });

    it('asks for nothing while the session is shut', () => {
        inScope(
            () => makeSummary({ positions: [held] }),
            () => false,
        );

        expect(socket.emitted).toEqual([]);
    });

    // A write re-reads the summary; the server has to re-read the holdings too
    it('watches again when a new summary arrives, and drops the valuation priced from the old one', async () => {
        const summary = shallowRef(makeSummary({ positions: [held] }));
        const { live } = inScope(() => summary.value);
        socket.deliver('portfolio:update', valuation(0, 5_000));

        summary.value = makeSummary({ positions: [held, { ...held, symbol: 'MSFT' }] });
        await nextTick();

        expect(live.valuation.value).toBeNull();
        expect(watches()).toEqual([{ number: 0 }, { number: 0 }]);
    });

    it('stops the watch when the slot it was pricing is emptied', async () => {
        const summary = shallowRef(makeSummary({ positions: [held] }));
        inScope(() => summary.value);

        summary.value = makeSummary({ positions: [] });
        await nextTick();

        expect(watches().at(-1)).toEqual({ number: null });
    });

    it('watches again after a reconnect, because the server holds the watch per connection', () => {
        inScope(() => makeSummary({ positions: [held] }));

        socket.deliver('connect', undefined);

        expect(watches()).toHaveLength(2);
    });

    it('stops the watch when the page goes', () => {
        const { stop } = inScope(() => makeSummary({ positions: [held] }));

        stop();

        expect(watches().at(-1)).toEqual({ number: null });
        expect(socket.listeners('portfolio:update')).toBe(0);
    });
});

describe('receiving', () => {
    it('takes the valuation for the open slot', () => {
        const { live } = inScope(() => makeSummary({ positions: [held] }));

        socket.deliver('portfolio:update', valuation(0, 5_000));

        expect(live.valuation.value?.totalValue).toBe(5_000);
    });

    it('ignores a valuation for a slot the page has since left', () => {
        const { live } = inScope(() => makeSummary({ number: 1, positions: [held] }));

        socket.deliver('portfolio:update', valuation(0, 5_000));

        expect(live.valuation.value).toBeNull();
    });
});

describe('the bell', () => {
    it('keeps the last valuation, and the closing one that lands after it', async () => {
        const open = shallowRef(true);
        const summary = makeSummary({ positions: [held] });
        const { live } = inScope(
            () => summary,
            () => open.value,
        );
        socket.deliver('portfolio:update', valuation(0, 5_000));

        open.value = false;
        await nextTick();
        socket.deliver('portfolio:update', valuation(0, 5_100));

        expect(live.valuation.value?.totalValue).toBe(5_100);
        expect(watches()).toEqual([{ number: 0 }]);
    });

    it('starts afresh at the next open', async () => {
        const open = shallowRef(true);
        const summary = makeSummary({ positions: [held] });
        const { live } = inScope(
            () => summary,
            () => open.value,
        );
        socket.deliver('portfolio:update', valuation(0, 5_000));
        open.value = false;
        await nextTick();

        open.value = true;
        await nextTick();

        expect(live.valuation.value).toBeNull();
        expect(watches()).toHaveLength(2);
    });

    it('stops the watch when a write lands after the bell, rather than price new holdings with old ones', async () => {
        const open = shallowRef(true);
        const summary = shallowRef(makeSummary({ positions: [held] }));
        inScope(
            () => summary.value,
            () => open.value,
        );
        open.value = false;
        await nextTick();

        summary.value = makeSummary({ positions: [held, { ...held, symbol: 'MSFT' }] });
        await nextTick();

        expect(watches().at(-1)).toEqual({ number: null });
    });
});

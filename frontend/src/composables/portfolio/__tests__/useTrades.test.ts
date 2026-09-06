import { describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { useTrades, type UseTradesReturn } from '@/composables/portfolio/useTrades';

const mock = mockApi();

const row = (id: string): Record<string, unknown> => ({
    id,
    symbol: 'AAPL',
    action: 'buy',
    shares: 1,
    price: 1,
    total: 1,
    commission: 0,
    tradeDate: '2026-03-02',
    createdAt: '2026-03-02T00:00:00.000Z',
});

const page = (ids: string[], total = ids.length): Record<string, unknown> => ({
    items: ids.map(row),
    total,
    page: 1,
    limit: 50,
});

const trade = { action: 'buy' as const, symbol: 'AAPL', shares: 1, price: 1, total: 1, tradeDate: '2026-03-02' };

function build(slot = 0): { trades: UseTradesReturn; onWrite: ReturnType<typeof vi.fn> } {
    const onWrite = vi.fn();
    return { trades: useTrades(() => slot, onWrite), onWrite };
}

describe('load', () => {
    it('reads the blotter for the open slot', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a', 'b']));
        const { trades } = build();

        await trades.load();

        expect(trades.items.value).toHaveLength(2);
        expect(trades.total.value).toBe(2);
        expect(trades.pending.value).toBe(false);
        expect(mock.last().search.get('limit')).toBe('50');
    });

    it('reports a failure and holds nothing', async () => {
        mock.on('GET /api/portfolios/0/trades', { error: 'INTERNAL' }, { status: 500 });
        const { trades } = build();

        await trades.load();

        expect(trades.items.value).toEqual([]);
        expect(trades.total.value).toBe(0);
        expect(trades.error.value).not.toBeNull();
    });

    it('counts at least one page even when there are no trades', async () => {
        mock.on('GET /api/portfolios/0/trades', page([], 0));
        const { trades } = build();

        await trades.load();

        expect(trades.pageCount.value).toBe(1);
    });

    it('counts a page per fifty trades', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 101));
        const { trades } = build();

        await trades.load();

        expect(trades.pageCount.value).toBe(3);
    });
});

describe('goToPage', () => {
    it('reads the page asked for', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 200));
        const { trades } = build();
        await trades.load();

        await trades.goToPage(3);

        expect(trades.page.value).toBe(3);
        expect(mock.last().search.get('page')).toBe('3');
    });

    it('clamps to the pages that exist', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 60));
        const { trades } = build();
        await trades.load();

        await trades.goToPage(99);
        expect(trades.page.value).toBe(2);

        await trades.goToPage(-1);
        expect(trades.page.value).toBe(1);
    });

    it('does nothing when it is already on that page', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 200));
        const { trades } = build();
        await trades.load();
        const before = mock.calls.length;

        await trades.goToPage(1);

        expect(mock.calls).toHaveLength(before);
    });
});

describe('the writes', () => {
    it('records a trade, re-reads, and tells the portfolio to re-read too', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a']));
        mock.on('POST /api/portfolios/0/trades', row('a'));
        const { trades, onWrite } = build();

        await trades.create(trade);

        expect(trades.items.value).toHaveLength(1);
        expect(onWrite).toHaveBeenCalledTimes(1);
    });

    it('goes back to the first page for a new trade, where the newest one lands', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 200));
        mock.on('POST /api/portfolios/0/trades', row('a'));
        const { trades } = build();
        await trades.load();
        await trades.goToPage(3);

        await trades.create(trade);

        expect(trades.page.value).toBe(1);
    });

    it('corrects a trade', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a']));
        mock.on('PATCH /api/portfolios/0/trades/a', row('a'));
        const { trades, onWrite } = build();

        await trades.update('a', trade);

        expect(onWrite).toHaveBeenCalledTimes(1);
    });

    it('reports a write the replay refused, and does not tell the portfolio to re-read', async () => {
        mock.on('POST /api/portfolios/0/trades', { error: 'INSUFFICIENT_BUYING_POWER' }, { status: 422 });
        const { trades, onWrite } = build();

        await expect(trades.create(trade)).rejects.toBeDefined();

        expect(trades.error.value).not.toBeNull();
        expect(onWrite).not.toHaveBeenCalled();
    });

    it('steps back a page when the last row on it is removed', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 51));
        mock.on('DELETE /api/portfolios/0/trades/a', null, { status: 204 });
        const { trades } = build();
        await trades.load();
        await trades.goToPage(2);

        await trades.remove('a');

        expect(trades.page.value).toBe(1);
    });

    it('stays on the first page when the last row there is removed', async () => {
        mock.on('GET /api/portfolios/0/trades', page(['a'], 1));
        mock.on('DELETE /api/portfolios/0/trades/a', null, { status: 204 });
        const { trades } = build();
        await trades.load();

        await trades.remove('a');

        expect(trades.page.value).toBe(1);
    });
});

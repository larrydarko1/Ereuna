import { beforeEach, describe, expect, it } from 'vitest';
import { HttpResponse, http } from 'msw';
import { mockApi, ORIGIN } from '@/__tests__/support/msw';
import { clearAuth } from '@/api/client';
import { useWatchlists } from '@/composables/charts/useWatchlists';

const mock = mockApi();
const watchlists = useWatchlists();

const summary = (name: string, position = 0, tickerCount = 0): Record<string, unknown> => ({
    id: name,
    name,
    position,
    tickerCount,
    updatedAt: '2026-03-02T00:00:00.000Z',
});

const row = (ticker: string): Record<string, unknown> => ({ ticker, quote: null });

const detail = (name: string, tickers: string[]): Record<string, unknown> => ({
    name,
    rows: tickers.map(row),
});

beforeEach(() => {
    // The state is module-scoped so the strip and the panel share it; ending the
    // session is how the app itself resets it.
    clearAuth();
    localStorage.clear();
});

describe('load', () => {
    it('reads the lists and opens the first', async () => {
        mock.on('GET /api/watchlists', { items: [summary('Tech'), summary('Energy', 1)] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL']));

        await watchlists.load();

        expect(watchlists.lists.value).toHaveLength(2);
        expect(watchlists.activeName.value).toBe('Tech');
        expect(watchlists.rows.value).toHaveLength(1);
        expect(watchlists.loaded.value).toBe(true);
        expect(watchlists.pending.value).toBe(false);
    });

    it('opens the list this browser had open last', async () => {
        localStorage.setItem('ereuna-watchlist', 'Energy');
        mock.on('GET /api/watchlists', { items: [summary('Tech'), summary('Energy', 1)] });
        mock.on('GET /api/watchlists/Energy', detail('Energy', ['XOM']));

        await watchlists.load();

        expect(watchlists.activeName.value).toBe('Energy');
    });

    it('falls back to the first when the remembered list is gone', async () => {
        localStorage.setItem('ereuna-watchlist', 'Deleted');
        mock.on('GET /api/watchlists', { items: [summary('Tech')] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', []));

        await watchlists.load();

        expect(watchlists.activeName.value).toBe('Tech');
    });

    it('reports an account with no lists at all', async () => {
        mock.on('GET /api/watchlists', { items: [] });

        await watchlists.load();

        expect(watchlists.isEmpty.value).toBe(true);
        expect(watchlists.activeName.value).toBeNull();
        expect(watchlists.rows.value).toEqual([]);
    });

    it('reads once and answers from what it holds after that', async () => {
        let reads = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/watchlists`, () => {
                reads += 1;
                return HttpResponse.json({ items: [] });
            }),
        );

        await watchlists.load();
        await watchlists.load();

        expect(reads).toBe(1);
    });

    it('re-reads when forced', async () => {
        mock.on('GET /api/watchlists', { items: [] });
        await watchlists.load();
        mock.on('GET /api/watchlists', { items: [summary('Tech')] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', []));

        await watchlists.load(true);

        expect(watchlists.lists.value).toHaveLength(1);
    });

    it('is not left pending when the read fails', async () => {
        mock.on('GET /api/watchlists', { error: 'INTERNAL' }, { status: 500 });

        await expect(watchlists.load()).rejects.toBeDefined();

        expect(watchlists.pending.value).toBe(false);
    });
});

describe('open', () => {
    beforeEach(async () => {
        mock.on('GET /api/watchlists', { items: [summary('Tech'), summary('Energy', 1)] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL']));
        mock.on('GET /api/watchlists/Energy', detail('Energy', ['XOM', 'CVX']));
        await watchlists.load();
    });

    it('swaps the rows for the list asked for, and remembers it', async () => {
        await watchlists.open('Energy');

        expect(watchlists.activeName.value).toBe('Energy');
        expect(watchlists.rows.value).toHaveLength(2);
        expect(localStorage.getItem('ereuna-watchlist')).toBe('Energy');
    });

    it('does nothing when that list is already open', async () => {
        const before = mock.calls.length;

        await watchlists.open('Tech');

        expect(mock.calls).toHaveLength(before);
    });

    it('re-reads the open list on demand', async () => {
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL', 'MSFT']));

        await watchlists.refresh();

        expect(watchlists.rows.value).toHaveLength(2);
    });

    it('has nothing to refresh when no list is open', async () => {
        mock.on('GET /api/watchlists', { items: [] });
        await watchlists.load(true);
        const before = mock.calls.length;

        await watchlists.refresh();

        expect(mock.calls).toHaveLength(before);
    });
});

describe('managing the lists', () => {
    beforeEach(async () => {
        mock.on('GET /api/watchlists', { items: [summary('Tech'), summary('Energy', 1)] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL']));
        mock.on('GET /api/watchlists/Energy', detail('Energy', ['XOM']));
        await watchlists.load();
    });

    it('opens a new list as soon as it is created', async () => {
        mock.on('POST /api/watchlists', summary('Growth', 2));
        mock.on('GET /api/watchlists/Growth', detail('Growth', []));

        await watchlists.create('Growth');

        expect(watchlists.lists.value).toHaveLength(3);
        expect(watchlists.activeName.value).toBe('Growth');
    });

    it('follows a rename of the list that is open', async () => {
        mock.on('PATCH /api/watchlists/Tech', summary('Renamed'));

        await watchlists.rename('Tech', 'Renamed');

        expect(watchlists.activeName.value).toBe('Renamed');
        expect(localStorage.getItem('ereuna-watchlist')).toBe('Renamed');
        expect(watchlists.lists.value.map((list) => list.name)).toEqual(['Renamed', 'Energy']);
    });

    it('leaves the open list alone when another is renamed', async () => {
        mock.on('PATCH /api/watchlists/Energy', summary('Oil', 1));

        await watchlists.rename('Energy', 'Oil');

        expect(watchlists.activeName.value).toBe('Tech');
    });

    it('opens what is left after deleting the open list', async () => {
        mock.on('DELETE /api/watchlists/Tech', null, { status: 204 });

        await watchlists.remove('Tech');

        expect(watchlists.activeName.value).toBe('Energy');
        expect(watchlists.rows.value).toEqual([{ ticker: 'XOM', quote: null }]);
    });

    it('leaves nothing open after deleting the last list', async () => {
        mock.on('DELETE /api/watchlists/Energy', null, { status: 204 });
        mock.on('DELETE /api/watchlists/Tech', null, { status: 204 });

        await watchlists.remove('Energy');
        await watchlists.remove('Tech');

        expect(watchlists.activeName.value).toBeNull();
        expect(localStorage.getItem('ereuna-watchlist')).toBeNull();
    });

    it('takes the order the server settled on', async () => {
        mock.on('PUT /api/watchlists/order', { items: [summary('Energy'), summary('Tech', 1)] });

        await watchlists.reorderLists(['Energy', 'Tech']);

        expect(watchlists.lists.value.map((list) => list.name)).toEqual(['Energy', 'Tech']);
    });
});

describe('managing the tickers', () => {
    beforeEach(async () => {
        mock.on('GET /api/watchlists', { items: [summary('Tech', 0, 1)] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL']));
        await watchlists.load();
    });

    it('re-reads the list after an add, because only that read carries the quote', async () => {
        mock.on('POST /api/watchlists/Tech/tickers', { list: [] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL', 'MSFT']));

        await watchlists.addTicker('MSFT');

        expect(watchlists.rows.value).toHaveLength(2);
        expect(watchlists.lists.value[0]?.tickerCount).toBe(2);
    });

    it('takes a row off under the pointer, before the round trip', async () => {
        mock.server.use(
            http.delete(`${ORIGIN}/api/watchlists/Tech/tickers/AAPL`, () => {
                expect(watchlists.rows.value).toEqual([]);
                return HttpResponse.json({ list: [] });
            }),
        );

        await watchlists.removeTicker('AAPL');

        expect(watchlists.rows.value).toEqual([]);
        expect(watchlists.lists.value[0]?.tickerCount).toBe(0);
    });

    it('puts the row back when the removal is refused', async () => {
        mock.on('DELETE /api/watchlists/Tech/tickers/AAPL', { error: 'INTERNAL' }, { status: 500 });

        await expect(watchlists.removeTicker('AAPL')).rejects.toBeDefined();

        expect(watchlists.rows.value).toHaveLength(1);
    });

    it('reorders under the pointer and keeps the rows it already has', async () => {
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL', 'MSFT']));
        await watchlists.refresh();
        mock.on('PUT /api/watchlists/Tech/tickers', { list: [] });

        await watchlists.reorderTickers(['MSFT', 'AAPL']);

        expect(watchlists.rows.value.map((entry) => entry.ticker)).toEqual(['MSFT', 'AAPL']);
    });

    it('puts the old order back when the reorder is refused', async () => {
        mock.on('PUT /api/watchlists/Tech/tickers', { error: 'INTERNAL' }, { status: 500 });

        await expect(watchlists.reorderTickers(['AAPL'])).rejects.toBeDefined();

        expect(watchlists.rows.value.map((entry) => entry.ticker)).toEqual(['AAPL']);
    });

    it('writes nothing to a ticker route when no list is open', async () => {
        mock.on('GET /api/watchlists', { items: [] });
        await watchlists.load(true);
        const before = mock.calls.length;

        await watchlists.addTicker('MSFT');
        await watchlists.removeTicker('MSFT');
        await watchlists.reorderTickers(['MSFT']);

        expect(mock.calls).toHaveLength(before);
    });
});

describe('addTickers', () => {
    beforeEach(async () => {
        mock.on('GET /api/watchlists', { items: [summary('Tech')] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', []));
        await watchlists.load();
    });

    it('reports what went in and what the API refused, one symbol at a time', async () => {
        mock.server.use(
            http.post(`${ORIGIN}/api/watchlists/Tech/tickers`, async ({ request }) => {
                const { symbol } = (await request.json()) as { symbol: string };
                return symbol === 'NOPE'
                    ? HttpResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 })
                    : HttpResponse.json({ list: [] });
            }),
        );
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL', 'MSFT']));

        await expect(watchlists.addTickers(['AAPL', 'NOPE', 'MSFT'])).resolves.toEqual({
            added: 2,
            rejected: ['NOPE'],
        });
        expect(watchlists.rows.value).toHaveLength(2);
    });

    it('does not re-read when nothing went in', async () => {
        mock.on('POST /api/watchlists/Tech/tickers', { error: 'ASSET_NOT_FOUND' }, { status: 404 });
        const before = mock.calls.filter((call) => call.method === 'GET').length;

        await expect(watchlists.addTickers(['NOPE'])).resolves.toEqual({ added: 0, rejected: ['NOPE'] });

        expect(mock.calls.filter((call) => call.method === 'GET')).toHaveLength(before);
    });

    it('refuses every symbol when no list is open', async () => {
        mock.on('GET /api/watchlists', { items: [] });
        await watchlists.load(true);

        await expect(watchlists.addTickers(['AAPL'])).resolves.toEqual({ added: 0, rejected: ['AAPL'] });
    });
});

describe('the session ending', () => {
    it('drops every list, so the next user does not inherit them', async () => {
        mock.on('GET /api/watchlists', { items: [summary('Tech')] });
        mock.on('GET /api/watchlists/Tech', detail('Tech', ['AAPL']));
        await watchlists.load();

        clearAuth();

        expect(watchlists.lists.value).toEqual([]);
        expect(watchlists.rows.value).toEqual([]);
        expect(watchlists.activeName.value).toBeNull();
        expect(watchlists.loaded.value).toBe(false);
    });
});

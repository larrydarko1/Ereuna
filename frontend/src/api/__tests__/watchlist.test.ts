import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import {
    addTicker,
    createWatchlist,
    deleteWatchlist,
    getWatchlist,
    getWatchlists,
    removeTicker,
    renameWatchlist,
    reorderTickers,
    reorderWatchlists,
} from '@/api/watchlist';

const mock = mockApi();

describe('the collection', () => {
    it('lists the user lists', async () => {
        mock.on('GET /api/watchlists', { items: [] });

        await expect(getWatchlists()).resolves.toMatchObject({ data: { items: [] } });
    });

    it('creates one by name', async () => {
        mock.on('POST /api/watchlists', { name: 'Tech' });

        await createWatchlist('Tech');

        expect(mock.last().body).toEqual({ name: 'Tech' });
    });

    it('sets the display order', async () => {
        mock.on('PUT /api/watchlists/order', { items: [] });

        await reorderWatchlists(['Tech', 'Energy']);

        expect(mock.last().body).toEqual({ names: ['Tech', 'Energy'] });
    });
});

describe('one list', () => {
    it('reads it with its quotes', async () => {
        mock.on('GET /api/watchlists/Tech', { name: 'Tech', rows: [] });

        await getWatchlist('Tech');

        expect(mock.last().path).toBe('/api/watchlists/Tech');
    });

    it('encodes a name with a space, which is what the user typed', async () => {
        mock.on('GET /api/watchlists/:name', { name: 'My list', rows: [] });

        await getWatchlist('My list');

        expect(mock.last().path).toBe('/api/watchlists/My%20list');
    });

    it('renames it', async () => {
        mock.on('PATCH /api/watchlists/Tech', { name: 'Growth' });

        await renameWatchlist('Tech', 'Growth');

        expect(mock.last().body).toEqual({ name: 'Growth' });
    });

    it('deletes it', async () => {
        mock.on('DELETE /api/watchlists/Tech', null, { status: 204 });

        await deleteWatchlist('Tech');

        expect(mock.last().method).toBe('DELETE');
    });
});

describe('the tickers in a list', () => {
    it('sets their order', async () => {
        mock.on('PUT /api/watchlists/Tech/tickers', { list: [] });

        await reorderTickers('Tech', ['AAPL', 'MSFT']);

        expect(mock.last().body).toEqual({ symbols: ['AAPL', 'MSFT'] });
    });

    it('adds one', async () => {
        mock.on('POST /api/watchlists/Tech/tickers', { list: [] });

        await addTicker('Tech', 'AAPL');

        expect(mock.last().body).toEqual({ symbol: 'AAPL' });
    });

    it('removes one, encoding both segments', async () => {
        mock.on('DELETE /api/watchlists/:name/tickers/:symbol', { list: [] });

        await removeTicker('My list', 'BRK/B');

        expect(mock.last().path).toBe('/api/watchlists/My%20list/tickers/BRK%2FB');
    });
});

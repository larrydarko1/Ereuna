import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    listWatchlists: vi.fn(),
    createWatchlist: vi.fn(),
    reorderWatchlists: vi.fn(),
    getWatchlistRows: vi.fn(),
    renameWatchlist: vi.fn(),
    deleteWatchlist: vi.fn(),
    reorderTickers: vi.fn(),
    addTicker: vi.fn(),
    removeTicker: vi.fn(),
};

vi.mock('@/services/watchlist/index.js', () => service);

const { router } = await import('@/routes/watchlist/watchlists.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);
const list = { name: 'Tech', tickers: ['AAPL'] };

let harness: Harness;

beforeEach(async () => {
    for (const mock of Object.values(service)) mock.mockResolvedValue(list);
    service.listWatchlists.mockResolvedValue([list]);
    service.reorderWatchlists.mockResolvedValue([list]);
    service.deleteWatchlist.mockResolvedValue(undefined);
    harness = await serve((app) => app.use('/api/watchlists', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('collection routes', () => {
    it('lists the user lists under an items key', async () => {
        const response = await harness.call('/api/watchlists');

        expect(response.body).toEqual({ items: [list] });
        expect(service.listWatchlists).toHaveBeenCalledWith(USER_ID);
    });

    it('answers 201 on create', async () => {
        const response = await harness.call('/api/watchlists', json({ name: '  Tech  ' }));

        expect(response.status).toBe(201);
        expect(service.createWatchlist).toHaveBeenCalledWith(USER_ID, 'Tech');
    });

    it('refuses a name past sixty characters', async () => {
        const response = await harness.call('/api/watchlists', json({ name: 'x'.repeat(61) }));

        expect(response.status).toBe(422);
        expect(service.createWatchlist).not.toHaveBeenCalled();
    });
});

describe('PUT /api/watchlists/order', () => {
    it('is not read as a watchlist named "order"', async () => {
        const response = await harness.call('/api/watchlists/order', json({ names: ['Tech', 'Energy'] }, 'PUT'));

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ items: [list] });
        expect(service.reorderWatchlists).toHaveBeenCalledWith(USER_ID, ['Tech', 'Energy']);
    });

    it('refuses an order longer than a user may own', async () => {
        const { config } = await import('@/lib/config.js');
        const names = Array.from({ length: config.limits.watchlistsPerUser + 1 }, (_, i) => `L${i}`);
        const response = await harness.call('/api/watchlists/order', json({ names }, 'PUT'));

        expect(response.status).toBe(422);
    });
});

describe('single list routes', () => {
    it('reads one list with its quotes', async () => {
        const response = await harness.call('/api/watchlists/Tech');

        expect(response.body).toEqual(list);
        expect(service.getWatchlistRows).toHaveBeenCalledWith(USER_ID, 'Tech');
    });

    it('renames a list', async () => {
        await harness.call('/api/watchlists/Tech', json({ name: 'Growth' }, 'PATCH'));

        expect(service.renameWatchlist).toHaveBeenCalledWith(USER_ID, 'Tech', 'Growth');
    });

    it('answers 204 on delete', async () => {
        const response = await harness.call('/api/watchlists/Tech', { method: 'DELETE' });

        expect(response.status).toBe(204);
        expect(response.text).toBe('');
    });
});

describe('ticker routes', () => {
    it('sets the ticker order', async () => {
        const response = await harness.call('/api/watchlists/Tech/tickers', json({ symbols: ['aapl', 'msft'] }, 'PUT'));

        expect(response.body).toEqual({ list });
        expect(service.reorderTickers).toHaveBeenCalledWith(USER_ID, 'Tech', ['AAPL', 'MSFT']);
    });

    it('refuses more tickers than a list may hold', async () => {
        const { config } = await import('@/lib/config.js');
        const symbols = Array.from({ length: config.limits.tickersPerWatchlist + 1 }, (_, i) => `S${i}`);
        const response = await harness.call('/api/watchlists/Tech/tickers', json({ symbols }, 'PUT'));

        expect(response.status).toBe(422);
    });

    it('answers 201 when a ticker is added', async () => {
        const response = await harness.call('/api/watchlists/Tech/tickers', json({ symbol: 'aapl' }));

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ list });
        expect(service.addTicker).toHaveBeenCalledWith(USER_ID, 'Tech', 'AAPL');
    });

    it('removes a ticker', async () => {
        const response = await harness.call('/api/watchlists/Tech/tickers/aapl', { method: 'DELETE' });

        expect(response.status).toBe(200);
        expect(service.removeTicker).toHaveBeenCalledWith(USER_ID, 'Tech', 'AAPL');
    });

    it('refuses a symbol the schema does not allow', async () => {
        const response = await harness.call('/api/watchlists/Tech/tickers/A%24B', { method: 'DELETE' });

        expect(response.status).toBe(422);
        expect(service.removeTicker).not.toHaveBeenCalled();
    });
});

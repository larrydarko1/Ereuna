import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { addTrade, deleteTrade, getTrades, updateTrade, type TradeInput } from '@/api/trades';

const mock = mockApi();

const buy: TradeInput = {
    action: 'buy',
    symbol: 'AAPL',
    shares: 10,
    price: 180,
    total: 1800,
    tradeDate: '2026-03-02',
};

describe('getTrades', () => {
    it('reads the blotter for one slot', async () => {
        mock.on('GET /api/portfolios/0/trades', { items: [], total: 0, page: 1, limit: 50 });

        await getTrades(0);

        expect(mock.last().path).toBe('/api/portfolios/0/trades');
        expect(mock.last().search.toString()).toBe('');
    });

    it('narrows by symbol and page', async () => {
        mock.on('GET /api/portfolios/1/trades', { items: [], total: 0, page: 2, limit: 10 });

        await getTrades(1, { page: 2, limit: 10, symbol: 'AAPL' });

        expect(Object.fromEntries(mock.last().search)).toEqual({ page: '2', limit: '10', symbol: 'AAPL' });
    });
});

describe('writes', () => {
    it('posts a trade as given, without inventing the optional fields', async () => {
        mock.on('POST /api/portfolios/0/trades', { id: '1' });

        await addTrade(0, buy);

        expect(mock.last().body).toEqual(buy);
    });

    it('posts a cash movement that names no instrument', async () => {
        mock.on('POST /api/portfolios/0/trades', { id: '1' });

        await addTrade(0, { action: 'deposit', total: 5000, tradeDate: '2026-03-02' });

        expect(mock.last().body).toEqual({ action: 'deposit', total: 5000, tradeDate: '2026-03-02' });
    });

    it('addresses a correction by slot and trade id', async () => {
        mock.on('PATCH /api/portfolios/2/trades/abc', { id: 'abc' });

        await updateTrade(2, 'abc', buy);

        expect(mock.last().path).toBe('/api/portfolios/2/trades/abc');
    });

    it('deletes by slot and trade id', async () => {
        mock.on('DELETE /api/portfolios/2/trades/abc', null, { status: 204 });

        await deleteTrade(2, 'abc');

        expect(mock.last().method).toBe('DELETE');
    });
});

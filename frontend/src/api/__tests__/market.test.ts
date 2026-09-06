import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { getCalendar, getFinancials, getHolidays, getMarketStats, getNews } from '@/api/market';

const mock = mockApi();

describe('market reads', () => {
    it('reads the summary, whose ingest timestamp is a field on it', async () => {
        mock.on('GET /api/market/stats', { updatedAt: '2026-03-02T00:00:00.000Z' });

        await expect(getMarketStats()).resolves.toMatchObject({
            data: { updatedAt: '2026-03-02T00:00:00.000Z' },
        });
    });

    it('reads the holiday calendar', async () => {
        mock.on('GET /api/market/holidays', { Holidays: [{ date: '2026-12-25', name: 'Christmas' }] });

        const { data } = await getHolidays();

        expect(data.Holidays).toHaveLength(1);
    });

    it('reads the financial statements for one symbol', async () => {
        mock.on('GET /api/market/AAPL/financials', { symbol: 'AAPL', annual: [], quarterly: [] });

        await getFinancials('AAPL');

        expect(mock.last().path).toBe('/api/market/AAPL/financials');
    });

    it('encodes a symbol carrying a slash', async () => {
        mock.on('GET /api/market/:symbol/financials', { symbol: 'BRK/B', annual: [], quarterly: [] });

        await getFinancials('BRK/B');

        expect(mock.last().path).toBe('/api/market/BRK%2FB/financials');
    });
});

describe('getNews', () => {
    it('asks for the defaults when given no query', async () => {
        mock.on('GET /api/market/news', { items: [] });

        await getNews();

        expect(mock.last().search.toString()).toBe('');
    });

    it('sends a symbol list, a lower bound and a limit', async () => {
        mock.on('GET /api/market/news', { items: [] });

        await getNews({ symbols: ['AAPL', 'MSFT'], since: 'all', limit: 5 });

        const search = mock.last().search;
        expect(search.getAll('symbols[]')).toEqual(['AAPL', 'MSFT']);
        expect(search.get('since')).toBe('all');
        expect(search.get('limit')).toBe('5');
    });
});

describe('getCalendar', () => {
    it('asks for one day', async () => {
        mock.on('GET /api/market/calendar', { date: '2026-03-02', earnings: [], dividends: [], splits: [] });

        await getCalendar('2026-03-02');

        expect(mock.last().search.get('date')).toBe('2026-03-02');
    });
});

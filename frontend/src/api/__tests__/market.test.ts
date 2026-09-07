import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { getFinancials, getHolidays, getMarketStats } from '@/api/market';

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

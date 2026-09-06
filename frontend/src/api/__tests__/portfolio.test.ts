import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import {
    deletePortfolio,
    exportPortfolio,
    getPortfolio,
    getPortfolios,
    importPortfolio,
    setBaseValue,
    setBenchmarks,
    setDefaultCommission,
    setLeverage,
} from '@/api/portfolio';

const mock = mockApi();

describe('reads', () => {
    it('lists the slots the user has opened', async () => {
        mock.on('GET /api/portfolios', { items: [{ number: 0 }] });

        await expect(getPortfolios()).resolves.toMatchObject({ data: { items: [{ number: 0 }] } });
    });

    it('reads one valued slot', async () => {
        mock.on('GET /api/portfolios/2', { number: 2 });

        await getPortfolio(2);

        expect(mock.last().path).toBe('/api/portfolios/2');
    });

    it('exports the log and the settings together', async () => {
        mock.on('GET /api/portfolios/0/export', { portfolio: {}, trades: [] });

        await expect(exportPortfolio(0)).resolves.toMatchObject({ data: { trades: [] } });
    });

    it('deletes a slot', async () => {
        mock.on('DELETE /api/portfolios/0', null, { status: 204 });

        await deletePortfolio(0);

        expect(mock.last().method).toBe('DELETE');
    });
});

describe('settings', () => {
    it('sets the reference capital', async () => {
        mock.on('PUT /api/portfolios/0/base-value', { baseValue: 10000 });

        await setBaseValue(0, 10000);

        expect(mock.last().body).toEqual({ baseValue: 10000 });
    });

    it('sets the gross exposure limit', async () => {
        mock.on('PUT /api/portfolios/0/leverage', { leverage: 2 });

        await setLeverage(0, 2);

        expect(mock.last().body).toEqual({ leverage: 2 });
    });

    it('sets the default commission', async () => {
        mock.on('PUT /api/portfolios/0/commission', { defaultCommission: 1.5 });

        await setDefaultCommission(0, 1.5);

        expect(mock.last().body).toEqual({ commission: 1.5 });
    });

    it('sets the comparison symbols', async () => {
        mock.on('PUT /api/portfolios/0/benchmarks', { benchmarks: ['SPY'] });

        await setBenchmarks(0, ['SPY']);

        expect(mock.last().body).toEqual({ symbols: ['SPY'] });
    });
});

describe('importPortfolio', () => {
    it('sends the log alone when nothing else is declared', async () => {
        mock.on('POST /api/portfolios/0/import', { imported: 1 });

        await importPortfolio(0, {
            trades: [{ action: 'buy', symbol: 'AAPL', shares: 1, price: 1, total: 1, tradeDate: '2026-03-02' }],
        });

        expect(mock.last().body).toMatchObject({ trades: [{ symbol: 'AAPL' }] });
    });

    it('carries a declared track record the log cannot reproduce', async () => {
        mock.on('POST /api/portfolios/0/import', { imported: 0 });

        await importPortfolio(0, {
            trades: [],
            portfolio: { baseValue: 5000, valueHistory: [{ date: '2026-03-02', value: 5000 }] },
        });

        expect(mock.last().body).toMatchObject({
            portfolio: { baseValue: 5000, valueHistory: [{ date: '2026-03-02', value: 5000 }] },
        });
    });
});

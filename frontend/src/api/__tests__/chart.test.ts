import { describe, expect, it } from 'vitest';
import type { ChartDrawings } from '@ereuna/shared';
import { mockApi } from '@/__tests__/support/msw';
import { clearDrawings, getDrawings, getEvents, getProfile, getSeries, saveDrawings, searchAssets } from '@/api/chart';

const mock = mockApi();

const drawings: ChartDrawings = {
    trendLines: [],
    boxes: [],
    textAnnotations: [],
    freehandPaths: [],
    priceLevels: [],
};

describe('searchAssets', () => {
    it('sends the term, and no limit when none was given', async () => {
        mock.on('GET /api/charts/search', { items: [] });

        await searchAssets('app');

        expect(mock.last().search.get('q')).toBe('app');
        expect(mock.last().search.has('limit')).toBe(false);
    });

    it('sends the limit when there is one', async () => {
        mock.on('GET /api/charts/search', { items: [] });

        await searchAssets('app', 5);

        expect(mock.last().search.get('limit')).toBe('5');
    });
});

describe('getSeries', () => {
    it('asks for the symbol with no options at all by default', async () => {
        mock.on('GET /api/charts/AAPL', { symbol: 'AAPL', candles: [] });

        await getSeries('AAPL');

        expect(mock.last().search.toString()).toBe('');
    });

    it('sends the timeframe and the paging cursor', async () => {
        mock.on('GET /api/charts/AAPL', { symbol: 'AAPL', candles: [] });

        await getSeries('AAPL', { timeframe: 'weekly', before: '2026-03-02' });

        expect(Object.fromEntries(mock.last().search)).toEqual({ timeframe: 'weekly', before: '2026-03-02' });
    });

    it('encodes the symbol', async () => {
        mock.on('GET /api/charts/:symbol', { symbol: 'BRK/B', candles: [] });

        await getSeries('BRK/B');

        expect(mock.last().path).toBe('/api/charts/BRK%2FB');
    });
});

describe('getProfile', () => {
    it('reads the reference data behind the sidebar', async () => {
        mock.on('GET /api/charts/AAPL/profile', { symbol: 'AAPL' });

        await expect(getProfile('AAPL')).resolves.toMatchObject({ data: { symbol: 'AAPL' } });
    });
});

describe('getEvents', () => {
    it('asks for the default four of each', async () => {
        mock.on('GET /api/charts/AAPL/events', { earnings: [], dividends: [], splits: [] });

        await getEvents('AAPL');

        expect(mock.last().search.get('all')).toBe('false');
    });

    it('asks for the whole history when told to', async () => {
        mock.on('GET /api/charts/AAPL/events', { earnings: [], dividends: [], splits: [] });

        await getEvents('AAPL', true);

        expect(mock.last().search.get('all')).toBe('true');
    });
});

describe('drawings', () => {
    it('reads one timeframe at a time', async () => {
        mock.on('GET /api/charts/AAPL/drawings', drawings);

        await getDrawings('AAPL', 'daily');

        expect(mock.last().search.get('timeframe')).toBe('daily');
    });

    it('saves the items as the renderer produced them', async () => {
        mock.on('PUT /api/charts/AAPL/drawings', drawings);

        await saveDrawings('AAPL', 'weekly', { ...drawings, boxes: [{ anything: 'at all' }] });

        expect(mock.last().search.get('timeframe')).toBe('weekly');
        expect(mock.last().body).toMatchObject({ boxes: [{ anything: 'at all' }] });
    });

    it('clears one timeframe', async () => {
        mock.on('DELETE /api/charts/AAPL/drawings', null, { status: 204 });

        await clearDrawings('AAPL', 'intraday1m');

        expect(mock.last().search.get('timeframe')).toBe('intraday1m');
    });
});

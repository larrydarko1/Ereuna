import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const chartService = {
    getChartSeries: vi.fn(),
    getDrawings: vi.fn(),
    saveDrawings: vi.fn(),
    clearDrawings: vi.fn(),
};

const marketService = {
    searchAssets: vi.fn(),
    assetProfile: vi.fn(),
    earningsDates: vi.fn(),
    corporateActions: vi.fn(),
};

vi.mock('@/services/chart/index.js', () => chartService);
vi.mock('@/services/market/index.js', () => marketService);

const { router } = await import('@/routes/chart/charts.js');
const { config } = await import('@/lib/config.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);
const emptyDrawings = {
    trendLines: [],
    boxes: [],
    textAnnotations: [],
    freehandPaths: [],
    priceLevels: [],
};

let harness: Harness;

beforeEach(async () => {
    chartService.getChartSeries.mockResolvedValue({ bars: [] });
    chartService.getDrawings.mockResolvedValue(emptyDrawings);
    chartService.saveDrawings.mockResolvedValue(emptyDrawings);
    chartService.clearDrawings.mockResolvedValue(undefined);
    marketService.searchAssets.mockResolvedValue([{ symbol: 'AAPL' }]);
    marketService.assetProfile.mockResolvedValue({ symbol: 'AAPL' });
    marketService.earningsDates.mockResolvedValue(['2026-03-31']);
    marketService.corporateActions.mockResolvedValue([]);
    harness = await serve((app) => app.use('/api/charts', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('GET /api/charts/search', () => {
    it('is not read as a ticker named "search"', async () => {
        const response = await harness.call('/api/charts/search?q=app');

        expect(response.body).toEqual({ items: [{ symbol: 'AAPL' }] });
        expect(marketService.searchAssets).toHaveBeenCalledWith('app', 20);
        expect(chartService.getChartSeries).not.toHaveBeenCalled();
    });

    it('requires a term', async () => {
        const response = await harness.call('/api/charts/search?q=%20%20');

        expect(response.status).toBe(422);
    });

    it('refuses a limit past fifty', async () => {
        const response = await harness.call('/api/charts/search?q=app&limit=51');

        expect(response.status).toBe(422);
    });
});

describe('GET /api/charts/:symbol', () => {
    it('defaults to the daily timeframe and no cursor', async () => {
        const response = await harness.call('/api/charts/aapl');

        expect(response.status).toBe(200);
        expect(chartService.getChartSeries).toHaveBeenCalledWith(USER_ID, 'AAPL', 'daily', {});
    });

    it('takes a timeframe and a paging cursor', async () => {
        await harness.call('/api/charts/AAPL?timeframe=intraday1m&before=2026-03-02');

        expect(chartService.getChartSeries).toHaveBeenCalledWith(USER_ID, 'AAPL', 'intraday1m', {
            before: new Date('2026-03-02'),
        });
    });

    it('refuses a timeframe the aggregator does not produce', async () => {
        const response = await harness.call('/api/charts/AAPL?timeframe=3min');

        expect(response.status).toBe(422);
        expect(chartService.getChartSeries).not.toHaveBeenCalled();
    });
});

describe('GET /api/charts/:symbol/profile', () => {
    it('answers with the reference data', async () => {
        const response = await harness.call('/api/charts/aapl/profile');

        expect(response.body).toEqual({ symbol: 'AAPL' });
        expect(marketService.assetProfile).toHaveBeenCalledWith('AAPL');
    });
});

describe('GET /api/charts/:symbol/events', () => {
    it('caps the markers at four by default', async () => {
        const response = await harness.call('/api/charts/AAPL/events');

        expect(response.body).toEqual({ earnings: ['2026-03-31'], dividends: [], splits: [] });
        expect(marketService.corporateActions).toHaveBeenCalledWith('AAPL', 'dividends', 4);
        expect(marketService.corporateActions).toHaveBeenCalledWith('AAPL', 'splits', 4);
    });

    it('returns the full history for all=true', async () => {
        await harness.call('/api/charts/AAPL/events?all=true');

        expect(marketService.corporateActions).toHaveBeenCalledWith('AAPL', 'dividends', 500);
    });

    it('refuses an `all` that is not a boolean', async () => {
        const response = await harness.call('/api/charts/AAPL/events?all=maybe');

        expect(response.status).toBe(422);
    });
});

describe('drawings', () => {
    it('reads the annotations for a timeframe', async () => {
        const response = await harness.call('/api/charts/aapl/drawings?timeframe=weekly');

        expect(response.body).toEqual(emptyDrawings);
        expect(chartService.getDrawings).toHaveBeenCalledWith(USER_ID, 'AAPL', 'weekly');
    });

    it('stores the items opaquely — the renderer owns their geometry', async () => {
        const body = { ...emptyDrawings, trendLines: [{ anything: 'at all' }] };
        const response = await harness.call('/api/charts/AAPL/drawings', json(body, 'PUT'));

        expect(response.status).toBe(200);
        expect(chartService.saveDrawings).toHaveBeenCalledWith(USER_ID, 'AAPL', 'daily', body);
    });

    it('defaults every missing kind to an empty list', async () => {
        await harness.call('/api/charts/AAPL/drawings', json({}, 'PUT'));

        expect(chartService.saveDrawings).toHaveBeenCalledWith(USER_ID, 'AAPL', 'daily', emptyDrawings);
    });

    it('refuses more items of one kind than the cap allows', async () => {
        const trendLines = Array.from({ length: config.limits.drawingsPerKind + 1 }, () => ({}));
        const response = await harness.call('/api/charts/AAPL/drawings', json({ trendLines }, 'PUT'));

        expect(response.status).toBe(422);
        expect(chartService.saveDrawings).not.toHaveBeenCalled();
    });

    it('answers 204 when the annotations are cleared', async () => {
        const response = await harness.call('/api/charts/AAPL/drawings?timeframe=intraday1hr', { method: 'DELETE' });

        expect(response.status).toBe(204);
        expect(chartService.clearDrawings).toHaveBeenCalledWith(USER_ID, 'AAPL', 'intraday1hr');
    });
});

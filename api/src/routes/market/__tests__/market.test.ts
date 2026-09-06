import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    marketStats: vi.fn(),
    holidays: vi.fn(),
    news: vi.fn(),
    dayCalendar: vi.fn(),
    financials: vi.fn(),
};

vi.mock('@/services/market/index.js', () => service);
vi.mock('@ereuna/shared', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@ereuna/shared')>()),
    lastTradingDay: () => new Date('2026-09-04T00:00:00.000Z'),
}));

const { router } = await import('@/routes/market/market.js');

let harness: Harness;

beforeEach(async () => {
    service.marketStats.mockResolvedValue({ breadth: {} });
    service.holidays.mockResolvedValue([{ date: '2026-12-25', name: 'Christmas' }]);
    service.news.mockResolvedValue([{ title: 'headline' }]);
    service.dayCalendar.mockResolvedValue({ earnings: [] });
    service.financials.mockResolvedValue({ annual: [] });
    harness = await serve((app) => app.use('/api/market', quietLogger, router));
});

afterEach(async () => {
    await harness.close();
});

describe('GET /api/market/stats', () => {
    it('answers with the ingested summary', async () => {
        const response = await harness.call('/api/market/stats');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ breadth: {} });
    });
});

describe('GET /api/market/holidays', () => {
    it('answers with the exchange calendar', async () => {
        const response = await harness.call('/api/market/holidays');

        expect(response.body).toEqual([{ date: '2026-12-25', name: 'Christmas' }]);
    });
});

describe('GET /api/market/news', () => {
    it('defaults to the last trading day and twenty headlines', async () => {
        const response = await harness.call('/api/market/news');

        expect(response.body).toEqual({ items: [{ title: 'headline' }] });
        expect(service.news).toHaveBeenCalledWith({ since: new Date('2026-09-04T00:00:00.000Z'), limit: 20 });
    });

    it('splits, trims and uppercases a symbol list', async () => {
        await harness.call('/api/market/news?symbols=aapl,%20msft%20,,tsla');

        expect(service.news).toHaveBeenCalledWith(expect.objectContaining({ symbols: ['AAPL', 'MSFT', 'TSLA'] }));
    });

    it('drops the date bound entirely for `since=all`', async () => {
        await harness.call('/api/market/news?since=all');

        expect(service.news).toHaveBeenCalledWith({ limit: 20 });
    });

    it('takes an explicit date', async () => {
        await harness.call('/api/market/news?since=2026-01-05&limit=5');

        expect(service.news).toHaveBeenCalledWith({ since: new Date('2026-01-05'), limit: 5 });
    });

    it('refuses a date that is not a date', async () => {
        const response = await harness.call('/api/market/news?since=yesterday');

        expect(response.status).toBe(422);
        expect(service.news).not.toHaveBeenCalled();
    });

    it('refuses more than a hundred headlines', async () => {
        const response = await harness.call('/api/market/news?limit=101');

        expect(response.status).toBe(422);
    });

    it('refuses a symbol list longer than the per-request cap', async () => {
        const { config } = await import('@/lib/config.js');
        const symbols = Array.from({ length: config.limits.symbolsPerRequest + 1 }, (_, i) => `S${i}`);
        const response = await harness.call(`/api/market/news?symbols=${symbols.join(',')}`);

        expect(response.status).toBe(422);
    });
});

describe('GET /api/market/calendar', () => {
    it('reads the day as UTC midnight, not as the server timezone', async () => {
        const response = await harness.call('/api/market/calendar?date=2026-01-05');

        expect(response.status).toBe(200);
        expect(service.dayCalendar).toHaveBeenCalledWith(new Date('2026-01-05T00:00:00Z'));
    });

    it('requires a date', async () => {
        const response = await harness.call('/api/market/calendar');

        expect(response.status).toBe(422);
    });
});

describe('GET /api/market/:symbol/financials', () => {
    it('answers with the statements for the symbol', async () => {
        const response = await harness.call('/api/market/aapl/financials');

        expect(response.body).toEqual({ annual: [] });
        expect(service.financials).toHaveBeenCalledWith('AAPL');
    });

    it('does not shadow the fixed paths registered above it', async () => {
        await harness.call('/api/market/stats');

        expect(service.financials).not.toHaveBeenCalled();
        expect(service.marketStats).toHaveBeenCalledTimes(1);
    });
});

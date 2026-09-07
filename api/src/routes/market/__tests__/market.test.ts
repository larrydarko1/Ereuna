import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    marketStats: vi.fn(),
    holidays: vi.fn(),
    financials: vi.fn(),
};

vi.mock('@/services/market/index.js', () => service);

const { router } = await import('@/routes/market/market.js');

let harness: Harness;

beforeEach(async () => {
    service.marketStats.mockResolvedValue({ breadth: {} });
    service.holidays.mockResolvedValue([{ date: '2026-12-25', name: 'Christmas' }]);
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

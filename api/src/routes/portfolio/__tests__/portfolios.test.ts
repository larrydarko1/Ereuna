import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    listPortfolios: vi.fn(),
    getSummary: vi.fn(),
    deletePortfolio: vi.fn(),
    setBaseValue: vi.fn(),
    setLeverage: vi.fn(),
    setDefaultCommission: vi.fn(),
    setBenchmarks: vi.fn(),
    exportPortfolio: vi.fn(),
    replaceTrades: vi.fn(),
};

vi.mock('@/services/portfolio/index.js', () => service);

const { router } = await import('@/routes/portfolio/portfolios.js');
const { config } = await import('@/lib/config.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);

const trade = { action: 'buy', symbol: 'AAPL', shares: 10, price: 180, total: 1800, tradeDate: '2026-03-02' };

let harness: Harness;

beforeEach(async () => {
    service.listPortfolios.mockResolvedValue([{ number: 0 }]);
    service.getSummary.mockResolvedValue({ number: 0, value: 1000 });
    service.deletePortfolio.mockResolvedValue(undefined);
    service.setBaseValue.mockResolvedValue({ baseValue: 10000, leverage: 1 });
    service.setLeverage.mockResolvedValue(2);
    service.setDefaultCommission.mockResolvedValue(1.5);
    service.setBenchmarks.mockResolvedValue(['SPY']);
    service.exportPortfolio.mockResolvedValue({ trades: [], portfolio: {} });
    service.replaceTrades.mockResolvedValue(1);
    harness = await serve((app) => app.use('/api/portfolios', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('reads', () => {
    it('lists the opened slots under an items key', async () => {
        const response = await harness.call('/api/portfolios');

        expect(response.body).toEqual({ items: [{ number: 0 }] });
        expect(service.listPortfolios).toHaveBeenCalledWith(USER_ID);
    });

    it('coerces the slot number out of the path', async () => {
        await harness.call('/api/portfolios/3');

        expect(service.getSummary).toHaveBeenCalledWith(USER_ID, 3);
    });

    it('refuses a slot that is not an integer', async () => {
        const response = await harness.call('/api/portfolios/1.5');

        expect(response.status).toBe(422);
        expect(service.getSummary).not.toHaveBeenCalled();
    });

    it('answers 204 on delete', async () => {
        const response = await harness.call('/api/portfolios/0', { method: 'DELETE' });

        expect(response.status).toBe(204);
        expect(service.deletePortfolio).toHaveBeenCalledWith(USER_ID, 0);
    });

    it('exports the log and the summary together', async () => {
        const response = await harness.call('/api/portfolios/0/export');

        expect(response.body).toEqual({ trades: [], portfolio: {} });
    });
});

describe('settings', () => {
    it('answers with only the base value the service settled on', async () => {
        const response = await harness.call('/api/portfolios/0/base-value', json({ baseValue: 10000 }, 'PUT'));

        expect(response.body).toEqual({ baseValue: 10000 });
        expect(service.setBaseValue).toHaveBeenCalledWith(USER_ID, 0, 10000);
    });

    it('refuses a negative base value', async () => {
        const response = await harness.call('/api/portfolios/0/base-value', json({ baseValue: -1 }, 'PUT'));

        expect(response.status).toBe(422);
    });

    it('sets leverage', async () => {
        const response = await harness.call('/api/portfolios/0/leverage', json({ leverage: 2 }, 'PUT'));

        expect(response.body).toEqual({ leverage: 2 });
    });

    it('refuses leverage below one — that is not deleveraging, it is nonsense', async () => {
        const response = await harness.call('/api/portfolios/0/leverage', json({ leverage: 0.5 }, 'PUT'));

        expect(response.status).toBe(422);
    });

    it('refuses leverage past the configured ceiling', async () => {
        const response = await harness.call(
            '/api/portfolios/0/leverage',
            json({ leverage: config.limits.maxLeverage + 1 }, 'PUT'),
        );

        expect(response.status).toBe(422);
    });

    it('sets the default commission', async () => {
        const response = await harness.call('/api/portfolios/0/commission', json({ commission: 1.5 }, 'PUT'));

        expect(response.body).toEqual({ defaultCommission: 1.5 });
    });

    it('sets the benchmarks, uppercased', async () => {
        const response = await harness.call('/api/portfolios/0/benchmarks', json({ symbols: ['spy'] }, 'PUT'));

        expect(response.body).toEqual({ benchmarks: ['SPY'] });
        expect(service.setBenchmarks).toHaveBeenCalledWith(USER_ID, 0, ['SPY']);
    });

    it('refuses more benchmarks than a portfolio may carry', async () => {
        const symbols = Array.from({ length: config.limits.benchmarksPerPortfolio + 1 }, (_, i) => `S${i}`);
        const response = await harness.call('/api/portfolios/0/benchmarks', json({ symbols }, 'PUT'));

        expect(response.status).toBe(422);
    });
});

describe('POST /api/portfolios/:number/import', () => {
    it('replays the trades and answers with the count', async () => {
        const response = await harness.call('/api/portfolios/0/import', json({ trades: [trade] }));

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ imported: 1 });
        expect(service.replaceTrades).toHaveBeenCalledWith(USER_ID, 0, [expect.objectContaining({ symbol: 'AAPL' })], {
            settings: {},
            declared: {},
        });
    });

    it('passes through only the settings the export actually declared', async () => {
        await harness.call(
            '/api/portfolios/0/import',
            json({ trades: [], portfolio: { baseValue: 5000, benchmarks: ['spy'] } }),
        );

        const [, , , options] = service.replaceTrades.mock.calls[0] as [
            unknown,
            unknown,
            unknown,
            { settings: object },
        ];
        expect(options.settings).toEqual({ baseValue: 5000, benchmarks: ['SPY'] });
    });

    it('drops a null stats block rather than declaring it', async () => {
        await harness.call(
            '/api/portfolios/0/import',
            json({ trades: [], portfolio: { stats: null, valueHistory: [{ date: '2026-03-02', value: 10 }] } }),
        );

        const [, , , options] = service.replaceTrades.mock.calls[0] as [
            unknown,
            unknown,
            unknown,
            { declared: Record<string, unknown> },
        ];
        expect(options.declared).toEqual({ valueHistory: [{ date: '2026-03-02', value: 10 }] });
    });

    it('carries a declared stats block through', async () => {
        const stats = {
            realizedPL: 10,
            realizedPLPercent: 1,
            winnerCount: 1,
            loserCount: 0,
            breakevenCount: 0,
            winnerPercent: 100,
            loserPercent: 0,
            breakevenPercent: 0,
            avgGain: 10,
            avgLoss: 0,
            avgGainAbs: 10,
            avgLossAbs: 0,
            avgPositionSize: 1800,
            avgHoldTimeWinners: 3,
            avgHoldTimeLosers: 0,
            gainLossRatio: null,
            profitFactor: null,
            riskRewardRatio: null,
            sortinoRatio: null,
            totalCommission: 0,
            longCount: 1,
            shortCount: 0,
            biggestWinner: { ticker: 'AAPL', amount: 10, tradeCount: 1 },
            biggestLoser: null,
            tradeReturnsChart: { bins: [], medianBinIndex: -1 },
        };

        await harness.call('/api/portfolios/0/import', json({ trades: [], portfolio: { stats } }));

        const [, , , options] = service.replaceTrades.mock.calls[0] as [
            unknown,
            unknown,
            unknown,
            { declared: { stats?: unknown } },
        ];
        expect(options.declared.stats).toEqual(stats);
    });

    it('refuses an import beyond the row cap', async () => {
        const trades = Array.from({ length: config.limits.importRows + 1 }, () => trade);
        const response = await harness.call('/api/portfolios/0/import', json({ trades }));

        expect(response.status).toBe(422);
        expect(service.replaceTrades).not.toHaveBeenCalled();
    });

    it('refuses an import whose trades are not trades', async () => {
        const response = await harness.call('/api/portfolios/0/import', json({ trades: [{ action: 'buy' }] }));

        expect(response.status).toBe(422);
    });
});

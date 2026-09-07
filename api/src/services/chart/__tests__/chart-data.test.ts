import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const state: {
    asset: Record<string, unknown>;
    series: { candles: { time: string; close: number }[] };
    preferences: Record<string, unknown>;
    barArgs: unknown[][];
} = {
    asset: { Symbol: 'AAPL' },
    series: { candles: [] },
    preferences: { chartSettings: null },
    barArgs: [],
};

vi.mock('@/services/market/index.js', () => ({
    getAsset: () => Promise.resolve(state.asset),
    barSeries: (...args: unknown[]) => {
        state.barArgs.push(args);
        return Promise.resolve(state.series);
    },
}));
vi.mock('@/services/user/index.js', () => ({ getPreferences: () => Promise.resolve(state.preferences) }));

const { getChartSeries } = await import('@/services/chart/chart-data.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

/** `count` daily closes, rising by one a day. */
const rising = (count: number): { candles: { time: string; close: number }[] } => ({
    candles: Array.from({ length: count }, (_unused, index) => ({
        time: `2026-01-${String(index + 1).padStart(2, '0')}`,
        close: 100 + index,
    })),
});

beforeEach(() => {
    state.asset = { Symbol: 'AAPL' };
    state.series = rising(300);
    state.preferences = { chartSettings: null };
    state.barArgs = [];
});

describe('getChartSeries', () => {
    it('carries the series through, tagged with what was asked for', async () => {
        const result = await getChartSeries(USER_ID, 'AAPL', 'daily');
        expect(result.symbol).toBe('AAPL');
        expect(result.timeframe).toBe('daily');
        expect(result.candles).toHaveLength(300);
    });

    it('passes the paging option down to the bar read', async () => {
        const before = new Date('2026-01-01T00:00:00.000Z');
        await getChartSeries(USER_ID, 'AAPL', 'weekly', { before });
        expect(state.barArgs[0]).toEqual(['AAPL', 'weekly', { before }]);
    });

    it('overlays the four default averages when the user has configured none', async () => {
        const result = await getChartSeries(USER_ID, 'AAPL', 'daily');
        expect(result.overlays.map((o) => `${o.type}${o.period}`)).toEqual(['SMA10', 'SMA20', 'SMA50', 'SMA200']);
    });

    it("overlays the user's own indicators instead, once they have some", async () => {
        state.preferences = {
            chartSettings: { indicators: [{ type: 'EMA', period: 9, visible: true }] },
        };
        const result = await getChartSeries(USER_ID, 'AAPL', 'daily');
        expect(result.overlays.map((o) => `${o.type}${o.period}`)).toEqual(['EMA9']);
    });

    it('leaves out an indicator the user has hidden', async () => {
        state.preferences = {
            chartSettings: {
                indicators: [
                    { type: 'SMA', period: 10, visible: true },
                    { type: 'SMA', period: 20, visible: false },
                ],
            },
        };
        const result = await getChartSeries(USER_ID, 'AAPL', 'daily');
        expect(result.overlays).toHaveLength(1);
    });

    it('computes each overlay server-side, rather than sending the window twice', async () => {
        const result = await getChartSeries(USER_ID, 'AAPL', 'daily');
        const tenDay = result.overlays.find((o) => o.period === 10);
        expect(tenDay?.points.length).toBeGreaterThan(0);
        expect(tenDay?.points.at(-1)?.value).toBeCloseTo(394.5, 6);
    });

    it('produces an empty overlay when there are fewer bars than the period', async () => {
        state.series = rising(3);
        const result = await getChartSeries(USER_ID, 'AAPL', 'daily');
        expect(result.overlays.every((o) => o.points.length === 0)).toBe(true);
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import type { LifetimeStats, Series } from '@/organize/bars.js';
import type { Asset } from '@/organize/universe.js';

const state: {
    series: Map<string, Series>;
    lifetime: Map<string, LifetimeStats>;
    written: AnyBulkWriteOperation<AssetInfoDoc>[][];
} = { series: new Map(), lifetime: new Map(), written: [] };

vi.mock('@/organize/bars.js', () => ({
    dailySeries: (symbols: readonly string[]) =>
        Promise.resolve(new Map([...state.series].filter(([symbol]) => symbols.includes(symbol)))),
    lifetimeStats: () => Promise.resolve(state.lifetime),
}));

vi.mock('@/organize/write.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/organize/write.js')>();
    return {
        setOn: original.setOn,
        writeAssetInfo: (operations: AnyBulkWriteOperation<AssetInfoDoc>[]) => {
            state.written.push(operations);
            return Promise.resolve();
        },
    };
});

vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

const { updateDailyMetrics } = await import('@/organize/daily-metrics.js');

function asset(symbol: string, overrides: Partial<Asset> = {}): Asset {
    return {
        symbol,
        assetType: 'Stock',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Hardware',
        marketCap: null,
        sharesOutstanding: 1_000,
        ipo: null,
        ...overrides,
    };
}

/** `count` ascending daily bars, closing at `close(index)`. */
function series(count: number, close: (index: number) => number, startYear = 2026): Series {
    const bars = Array.from({ length: count }, (_unused, index) => ({
        timestamp: new Date(Date.UTC(startYear, 0, 1 + index)),
        value: close(index),
    }));

    return {
        timestamps: bars.map((bar) => bar.timestamp),
        opens: bars.map((bar) => bar.value),
        highs: bars.map((bar) => bar.value + 1),
        lows: bars.map((bar) => bar.value - 1),
        closes: bars.map((bar) => bar.value),
        volumes: bars.map(() => 1_000),
    };
}

/** Every field written for one symbol, merged across the run's two write phases. */
function fieldsFor(symbol: string): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const batch of state.written) {
        for (const operation of batch) {
            const update = operation as {
                updateOne: { filter: { Symbol: string }; update: { $set: Record<string, unknown> } };
            };
            if (update.updateOne.filter.Symbol === symbol) Object.assign(merged, update.updateOne.update.$set);
        }
    }
    return merged;
}

beforeEach(() => {
    state.series = new Map();
    state.lifetime = new Map();
    state.written = [];
});

describe('updateDailyMetrics', () => {
    it('reports nothing covered for an empty universe', async () => {
        await expect(updateDailyMetrics([])).resolves.toBe(0);
    });

    it('skips a symbol with no bars at all', async () => {
        await expect(updateDailyMetrics([asset('AAPL')])).resolves.toBe(0);
        expect(fieldsFor('AAPL')).toEqual({});
    });

    it('skips a symbol whose series came back empty', async () => {
        state.series.set(
            'AAPL',
            series(0, () => 0),
        );
        await expect(updateDailyMetrics([asset('AAPL')])).resolves.toBe(0);
    });

    it('counts the symbols that had enough history to produce something', async () => {
        state.series.set(
            'AAPL',
            series(10, (index) => 100 + index),
        );
        state.series.set(
            'MSFT',
            series(10, (index) => 50 + index),
        );
        await expect(updateDailyMetrics([asset('AAPL'), asset('MSFT'), asset('NVDA')])).resolves.toBe(2);
    });

    it('batches the universe rather than holding every series at once', async () => {
        const universe = Array.from({ length: 401 }, (_unused, index) => asset(`S${index}`));
        for (const one of universe)
            state.series.set(
                one.symbol,
                series(5, (index) => 10 + index),
            );
        await updateDailyMetrics(universe);
        // Two metric batches plus the one relative-strength write at the end
        expect(state.written).toHaveLength(3);
    });
});

describe('the derived fields', () => {
    beforeEach(() => {
        state.series.set(
            'AAPL',
            series(300, (index) => 100 + index),
        );
    });

    it('writes the latest bar as the TimeSeries block, rounded to the cent', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL').TimeSeries).toEqual({ open: 399, high: 400, low: 398, close: 399, volume: 1000 });
    });

    it('derives market capitalisation from the close and the share count', async () => {
        await updateDailyMetrics([asset('AAPL', { sharesOutstanding: 10 })]);
        expect(fieldsFor('AAPL').MarketCapitalization).toBe(3_990);
    });

    it('leaves market capitalisation null when the share count is unknown', async () => {
        await updateDailyMetrics([asset('AAPL', { sharesOutstanding: null })]);
        expect(fieldsFor('AAPL').MarketCapitalization).toBeNull();
    });

    it('writes one moving average per period the breadth panel reads', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        for (const period of [5, 10, 20, 50, 100, 150, 200]) expect(fields[`MA${period}`]).toBeTypeOf('number');
    });

    it('caps the 52-week window at a year of sessions even with more history', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        // 300 bars, so the window is the last 252: closes 148…399, highs +1
        expect(fields.fiftytwoWeekHigh).toBe(400);
        expect(fields.fiftytwoWeekLow).toBe(147);
    });

    it('uses the whole history for a symbol with less than a year of bars', async () => {
        state.series.set(
            'SHORT',
            series(10, (index) => 100 + index),
        );
        await updateDailyMetrics([asset('SHORT')]);
        expect(fieldsFor('SHORT').fiftytwoWeekLow).toBe(99);
    });

    it('measures how far the close sits off each extreme', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        expect(fields.percoff52WeekHigh).toBeCloseTo((399 - 400) / 400, 6);
        expect(fields.percoff52WeekLow).toBeGreaterThan(0);
    });

    it('falls back to the 52-week extremes when the symbol has no lifetime stats', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        expect(fields.AlltimeHigh).toBe(fields.fiftytwoWeekHigh);
        expect(fields.AlltimeLow).toBe(fields.fiftytwoWeekLow);
    });

    it('prefers the lifetime extremes computed over the whole collection', async () => {
        state.lifetime.set('AAPL', {
            high: 9_999,
            low: 1,
            firstClose: 10,
            firstTimestamp: new Date('2016-01-01T00:00:00.000Z'),
            lastClose: 399,
            lastTimestamp: new Date('2026-01-01T00:00:00.000Z'),
        });
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL').AlltimeHigh).toBe(9_999);
        expect(fieldsFor('AAPL').AlltimeLow).toBe(1);
    });

    it('reports no growth rate at all without a lifetime record', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL')).toMatchObject({ CAGR: null, CAGRYears: null });
    });

    it('computes compound growth over the span the record covers', async () => {
        state.lifetime.set('AAPL', {
            high: 400,
            low: 100,
            firstClose: 100,
            firstTimestamp: new Date('2016-01-01T00:00:00.000Z'),
            lastClose: 400,
            lastTimestamp: new Date('2026-01-01T00:00:00.000Z'),
        });
        await updateDailyMetrics([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        expect(fields.CAGRYears).toBeCloseTo(10, 1);
        expect(fields.CAGR).toBeCloseTo(4 ** (1 / 10) - 1, 3);
    });

    it('withholds the span when it is too short to mean anything', async () => {
        state.lifetime.set('AAPL', {
            high: 110,
            low: 100,
            firstClose: 100,
            firstTimestamp: new Date('2026-01-01T00:00:00.000Z'),
            lastClose: 110,
            lastTimestamp: new Date('2026-01-20T00:00:00.000Z'),
        });
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL').CAGRYears).toBeNull();
    });

    it('dates the metrics from the last bar rather than the clock', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL').metricsUpdatedAt).toEqual(new Date(Date.UTC(2026, 0, 300)));
    });

    it('expresses the gap as a percentage while the change fields stay fractions', async () => {
        state.series.set(
            'GAP',
            series(2, (index) => (index === 0 ? 100 : 110)),
        );
        await updateDailyMetrics([asset('GAP')]);
        const fields = fieldsFor('GAP');
        expect(fields.Gap).toBeCloseTo(10, 6);
        expect(fields.todaychange).toBeCloseTo(0.1, 6);
    });

    it("measures year-to-date from this year's first close, not a fixed number of bars", async () => {
        const twoYears: Series = {
            timestamps: [
                new Date(Date.UTC(2025, 11, 30)),
                new Date(Date.UTC(2026, 0, 2)),
                new Date(Date.UTC(2026, 0, 3)),
            ],
            opens: [50, 100, 120],
            highs: [50, 100, 120],
            lows: [50, 100, 120],
            closes: [50, 100, 120],
            volumes: [1, 1, 1],
        };
        state.series.set('YTD', twoYears);
        await updateDailyMetrics([asset('YTD')]);
        expect(fieldsFor('YTD').ytdchange).toBeCloseTo(0.2, 6);
    });

    it("reports no year-to-date when this year's first close is zero", async () => {
        const zeroed: Series = {
            timestamps: [new Date(Date.UTC(2026, 0, 2)), new Date(Date.UTC(2026, 0, 3))],
            opens: [0, 10],
            highs: [0, 10],
            lows: [0, 10],
            closes: [0, 10],
            volumes: [1, 1],
        };
        state.series.set('ZERO', zeroed);
        await updateDailyMetrics([asset('ZERO')]);
        expect(fieldsFor('ZERO').ytdchange).toBeNull();
    });

    it('measures relative volume against a baseline that excludes today', async () => {
        const spike: Series = { ...series(10, () => 100) };
        spike.volumes = [...Array.from({ length: 9 }, () => 100), 200];
        state.series.set('VOL', spike);
        await updateDailyMetrics([asset('VOL')]);
        expect(fieldsFor('VOL').RelVolume1W).toBe(2);
    });

    it('reports no relative volume without enough history for the baseline', async () => {
        state.series.set(
            'SHORT',
            series(3, () => 100),
        );
        await updateDailyMetrics([asset('SHORT')]);
        expect(fieldsFor('SHORT').RelVolume1W).toBeNull();
    });

    it('rounds average volume to a whole share count', async () => {
        const fractional: Series = { ...series(10, () => 100) };
        fractional.volumes = [1, 2, 2, 2, 2, 2, 2, 2, 2, 3];
        state.series.set('VOL', fractional);
        await updateDailyMetrics([asset('VOL')]);
        expect(Number.isInteger(fieldsFor('VOL').AvgVolume1W)).toBe(true);
    });

    it('attaches the signal set the screener reads', async () => {
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL').Signals).toBeDefined();
    });
});

describe('relative strength', () => {
    it('scores 1–100 with the weakest symbol first', async () => {
        state.series.set(
            'WEAK',
            series(30, (index) => 200 - index),
        );
        state.series.set(
            'STRONG',
            series(30, (index) => 100 + index),
        );
        await updateDailyMetrics([asset('WEAK'), asset('STRONG')]);

        expect(fieldsFor('WEAK').RSScore1M).toBe(1);
        expect(fieldsFor('STRONG').RSScore1M).toBe(51);
    });

    it('scores each window separately', async () => {
        state.series.set(
            'AAPL',
            series(200, (index) => 100 + index),
        );
        await updateDailyMetrics([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        for (const field of ['RSScore1W', 'RSScore1M', 'RSScore4M']) expect(fields[field]).toBe(1);
    });

    it('leaves a window unscored when no symbol has enough history for it', async () => {
        state.series.set(
            'AAPL',
            series(10, (index) => 100 + index),
        );
        await updateDailyMetrics([asset('AAPL')]);
        expect(fieldsFor('AAPL').RSScore4M).toBeUndefined();
    });
});

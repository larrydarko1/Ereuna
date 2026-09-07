import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import type { ChartTimeframe } from '@ereuna/shared';
import { mockApi } from '@/__tests__/support/msw';
import { useChartSeries, type UseChartSeriesReturn } from '@/composables/charts/useChartSeries';

const mock = mockApi();

const candle = (time: string, close = 10): Record<string, number | string> => ({
    time,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
});

const series = (times: string[], extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    symbol: 'AAPL',
    timeframe: 'daily',
    candles: times.map((time) => candle(time)),
    volume: times.map((time) => ({ time, value: 100 })),
    overlays: [],
    ...extra,
});

function inScope(key: () => { symbol: string; timeframe: ChartTimeframe; overlays?: string }): {
    chart: UseChartSeriesReturn;
    stop: () => void;
} {
    const scope = effectScope();
    const chart = scope.run(() => useChartSeries(() => ({ overlays: '', ...key() }))) as UseChartSeriesReturn;
    return { chart, stop: () => scope.stop() };
}

describe('loading a series', () => {
    it('reads the bars, the volume and the overlays for the current pair', async () => {
        mock.on(
            'GET /api/charts/AAPL',
            series(['2026-03-02', '2026-03-03'], {
                overlays: [{ type: 'SMA', period: 10, points: [{ time: '2026-03-03', value: 9 }] }],
            }),
        );
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));
        expect(chart.volume.value).toHaveLength(2);
        expect(chart.overlays.value[0]).toMatchObject({ type: 'SMA', period: 10 });
        expect(chart.pending.value).toBe(false);
    });

    it('keeps a daily bar as a business day', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));
        expect(chart.bars.value[0]?.time).toBe('2026-03-02');
    });

    it("reads an intraday bar as UTC, not as the viewer's own offset", async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02T14:30:00']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'intraday1m' }));

        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));
        expect(chart.bars.value[0]?.time).toBe(Date.UTC(2026, 2, 2, 14, 30) / 1000);
    });

    it('reads nothing at all without a symbol', async () => {
        const { chart } = inScope(() => ({ symbol: '', timeframe: 'daily' }));

        await vi.waitFor(() => expect(chart.pending.value).toBe(false));
        expect(mock.calls).toHaveLength(0);
        expect(chart.bars.value).toEqual([]);
    });

    it('reloads when the pair changes, and drops what the old one held', async () => {
        const symbol = ref('AAPL');
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        mock.on('GET /api/charts/MSFT', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => ({ symbol: symbol.value, timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        symbol.value = 'MSFT';

        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));
    });

    it('re-reads the window when the user edits their moving averages', async () => {
        const overlays = ref('SMA10');
        mock.on(
            'GET /api/charts/AAPL',
            series(['2026-03-02'], {
                overlays: [{ type: 'SMA', period: 10, points: [{ time: '2026-03-02', value: 9 }] }],
            }),
        );
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily', overlays: overlays.value }));
        await vi.waitFor(() => expect(chart.overlays.value).toHaveLength(1));

        // The API computes the averages from the stored preference, so the new
        // one only reaches the chart if the key change re-issues the read.
        mock.on(
            'GET /api/charts/AAPL',
            series(['2026-03-02'], {
                overlays: [
                    { type: 'SMA', period: 10, points: [{ time: '2026-03-02', value: 9 }] },
                    { type: 'EMA', period: 50, points: [{ time: '2026-03-02', value: 8 }] },
                ],
            }),
        );
        overlays.value = 'SMA10,EMA50';

        await vi.waitFor(() => expect(chart.overlays.value).toHaveLength(2));
    });

    it('holds its bars when something the key does not name changes', async () => {
        const unrelated = ref('dark');
        mock.on('GET /api/charts/AAPL', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => {
            void unrelated.value; // A preference read alongside the key, as the chart view does
            return { symbol: 'AAPL', timeframe: 'daily', overlays: 'SMA10' };
        });
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));

        // Reloading clears the bars first, so a spurious re-read blanks the chart.
        unrelated.value = 'light';
        await nextTick();

        expect(chart.bars.value).toHaveLength(2);
    });

    it('reports a failure and holds no bars', async () => {
        mock.on('GET /api/charts/AAPL', { error: 'ASSET_NOT_FOUND' }, { status: 404 });
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        await vi.waitFor(() => expect(chart.error.value).not.toBeNull());
        expect(chart.bars.value).toEqual([]);
        expect(chart.pending.value).toBe(false);
    });

    it('is exhausted straight away when the symbol has no bars at all', async () => {
        mock.on('GET /api/charts/AAPL', series([]));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        await vi.waitFor(() => expect(chart.exhausted.value).toBe(true));
    });

    it('reloads on demand', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        await chart.reload();

        expect(mock.calls.filter((call) => call.path === '/api/charts/AAPL')).toHaveLength(2);
    });

    it('writes nothing once the component is gone', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        const { chart, stop } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        stop();
        await vi.waitFor(() => expect(mock.calls).toHaveLength(1));

        expect(chart.bars.value).toEqual([]);
    });
});

describe('paging backwards', () => {
    it('prepends the page before the oldest bar held', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));

        mock.on('GET /api/charts/AAPL', series(['2026-02-27', '2026-02-28']));
        await chart.loadOlder();

        expect(chart.bars.value.map((bar) => bar.time)).toEqual([
            '2026-02-27',
            '2026-02-28',
            '2026-03-02',
            '2026-03-03',
        ]);
        expect(chart.volume.value).toHaveLength(4);
    });

    it('asks for what is strictly older than the oldest bar it holds', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));

        mock.on('GET /api/charts/AAPL', series(['2026-02-27']));
        await chart.loadOlder();

        expect(mock.last().search.get('before')).toBe('2026-03-02');
    });

    it('drops a bar the page repeats rather than plotting it twice', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));

        mock.on('GET /api/charts/AAPL', series(['2026-02-27', '2026-03-02']));
        await chart.loadOlder();

        expect(chart.bars.value.map((bar) => bar.time)).toEqual(['2026-02-27', '2026-03-02', '2026-03-03']);
    });

    it('continues each overlay leftwards without duplicating a point', async () => {
        mock.on(
            'GET /api/charts/AAPL',
            series(['2026-03-02'], {
                overlays: [{ type: 'SMA', period: 10, points: [{ time: '2026-03-02', value: 9 }] }],
            }),
        );
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        mock.on(
            'GET /api/charts/AAPL',
            series(['2026-02-27'], {
                overlays: [
                    {
                        type: 'SMA',
                        period: 10,
                        points: [
                            { time: '2026-02-27', value: 8 },
                            { time: '2026-03-02', value: 9 },
                        ],
                    },
                ],
            }),
        );
        await chart.loadOlder();

        expect(chart.overlays.value[0]?.points.map((point) => point.time)).toEqual(['2026-02-27', '2026-03-02']);
    });

    it('leaves an overlay the older page does not carry alone', async () => {
        mock.on(
            'GET /api/charts/AAPL',
            series(['2026-03-02'], {
                overlays: [{ type: 'EMA', period: 20, points: [{ time: '2026-03-02', value: 9 }] }],
            }),
        );
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        mock.on('GET /api/charts/AAPL', series(['2026-02-27']));
        await chart.loadOlder();

        expect(chart.overlays.value[0]?.points).toHaveLength(1);
    });

    it('stops asking once a page comes back empty', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        mock.on('GET /api/charts/AAPL', series([]));
        await chart.loadOlder();
        expect(chart.exhausted.value).toBe(true);

        const before = mock.calls.length;
        await chart.loadOlder();
        expect(mock.calls).toHaveLength(before);
    });

    it('does nothing before the first page has landed', async () => {
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        await chart.loadOlder();

        expect(mock.calls.filter((call) => call.search.has('before'))).toHaveLength(0);
    });

    it('keeps the bars it has when the older page fails', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        mock.on('GET /api/charts/AAPL', { error: 'INTERNAL' }, { status: 500 });
        await chart.loadOlder();

        expect(chart.bars.value).toHaveLength(1);
        expect(chart.error.value).toBeNull();
    });
});

describe('applyLive', () => {
    const live = (time: string, close: number): Parameters<UseChartSeriesReturn['applyLive']>[0] => ({
        time,
        open: close,
        high: close,
        low: close,
        close,
        volume: 5,
    });

    it('replaces the last bar while its bucket is still open', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));

        chart.applyLive(live('2026-03-03', 99));

        expect(chart.bars.value).toHaveLength(2);
        expect(chart.bars.value[1]?.close).toBe(99);
        expect(chart.volume.value[1]?.value).toBe(5);
    });

    it('appends once the bucket has rolled over', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(1));

        chart.applyLive(live('2026-03-03', 99));

        expect(chart.bars.value).toHaveLength(2);
    });

    it('ignores a bucket older than the last bar drawn', async () => {
        mock.on('GET /api/charts/AAPL', series(['2026-03-02', '2026-03-03']));
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));
        await vi.waitFor(() => expect(chart.bars.value).toHaveLength(2));

        chart.applyLive(live('2026-03-02', 99));

        expect(chart.bars.value[0]?.close).toBe(10);
        expect(chart.bars.value).toHaveLength(2);
    });

    it('does nothing on an empty chart', () => {
        const { chart } = inScope(() => ({ symbol: 'AAPL', timeframe: 'daily' }));

        chart.applyLive(live('2026-03-03', 99));

        expect(chart.bars.value).toEqual([]);
    });
});

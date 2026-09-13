import { type Mock, describe, expect, it, vi } from 'vitest';

import { mountChart, paint } from '@/lib/charting/__tests__/helpers/chart-harness';
import { timeAt } from '@/lib/charting/__tests__/helpers/market-data';
import { customStyleDefaults, seriesOptionsDefaults } from '@/lib/charting/engine/api/options/series-options-defaults';
import {
    type CustomData,
    type CustomSeriesPricePlotValues,
    type CustomSeriesWhitespaceData,
    type ICustomSeriesPaneRenderer,
    type ICustomSeriesPaneView,
} from '@/lib/charting/engine/model/series/icustom-series';
import { type CustomSeriesOptions } from '@/lib/charting/engine/model/series/series-options';
import { type Time } from '@/lib/charting/engine/model/time/types';

/** A band: one row carrying a high and a low, drawn as a filled strip. */
type BandData = { high: number; low: number } & CustomData<Time>;

type DrawSpy = ICustomSeriesPaneRenderer['draw'];
type UpdateSpy = ICustomSeriesPaneView<Time, BandData>['update'];

type Spies = {
    draw: Mock<DrawSpy>;
    update: Mock<UpdateSpy>;
    destroy: Mock<() => void>;
};

function bandView(): { view: ICustomSeriesPaneView<Time, BandData>; spies: Spies } {
    const spies: Spies = { draw: vi.fn<DrawSpy>(), update: vi.fn<UpdateSpy>(), destroy: vi.fn<() => void>() };

    const view: ICustomSeriesPaneView<Time, BandData> = {
        renderer: () => ({ draw: spies.draw }),
        update: spies.update,
        // Largest, smallest, current — which is what the scale autoscales over
        priceValueBuilder: (row: BandData): CustomSeriesPricePlotValues => [row.high, row.low, row.low],
        isWhitespace: (row): row is CustomSeriesWhitespaceData<Time> => (row as Partial<BandData>).high === undefined,
        defaultOptions: (): CustomSeriesOptions => ({ ...seriesOptionsDefaults, ...customStyleDefaults }),
        destroy: spies.destroy,
    };

    return { view, spies };
}

/** What the renderer was handed on the last paint. */
function lastUpdate(spies: Spies): Parameters<UpdateSpy>[0] {
    const call = spies.update.mock.calls[spies.update.mock.calls.length - 1];
    if (call === undefined) throw new Error('the view was never updated');
    return call[0];
}

function bandData(count = 30): BandData[] {
    return Array.from({ length: count }, (_, i) => ({
        time: timeAt(i),
        low: 100 + Math.sin(i / 4) * 5,
        high: 110 + Math.sin(i / 4) * 5,
    }));
}

describe('a custom series', () => {
    it('reports itself as Custom and draws through the view it was given', () => {
        const { chart } = mountChart();
        const { view, spies } = bandView();

        const series = chart.addCustomSeries(view);
        series.setData(bandData());
        paint(chart);

        expect(series.seriesType()).toBe('Custom');
        expect(spies.update).toHaveBeenCalled();
        expect(spies.draw).toHaveBeenCalled();
    });

    it('hands the renderer every bar with the x it was laid out at', () => {
        const { chart } = mountChart();
        const { view, spies } = bandView();
        chart.addCustomSeries(view).setData(bandData(12));

        paint(chart);

        const data = lastUpdate(spies);
        expect(data.bars).toHaveLength(12);
        expect(data.barSpacing).toBeGreaterThan(0);
        expect(data.bars[0]?.originalData.high).toBeCloseTo(110, 5);
        expect(Number.isNaN(data.bars[0]?.x)).toBe(false);
    });

    it('autoscales the price axis over the values the view reports', () => {
        const { chart } = mountChart();
        const { view } = bandView();
        const series = chart.addCustomSeries(view);
        series.setData(bandData());
        paint(chart);

        // Both edges of the band are inside the scale, because the builder
        // reported the high and the low for every row
        expect(series.priceToCoordinate(115)).not.toBeNull();
        expect(series.priceToCoordinate(95)).not.toBeNull();
    });

    it('skips a row the view calls whitespace', () => {
        const { chart } = mountChart();
        const { view, spies } = bandView();
        const series = chart.addCustomSeries(view);

        series.setData([
            ...bandData(6),
            { time: timeAt(6) },
            ...bandData(6).map((row, i) => ({ ...row, time: timeAt(7 + i) })),
        ]);
        paint(chart);

        const data = lastUpdate(spies);
        // Thirteen rows went in and twelve are plotted: the one the view called
        // whitespace is a hole in the series, not a bar with no value
        expect(data.bars).toHaveLength(12);
        expect(series.data().some((row) => row.time === timeAt(6))).toBe(false);
    });

    it('takes the options the view declares, and the overrides it is created with', () => {
        const { chart } = mountChart();
        const { view } = bandView();

        const series = chart.addCustomSeries(view, { priceLineVisible: false, lastValueVisible: false });

        expect(series.options().priceLineVisible).toBe(false);
        expect(series.options().lastValueVisible).toBe(false);
        expect(series.options().priceFormat.type).toBe(seriesOptionsDefaults.priceFormat.type);
    });

    it('stops drawing once the series is taken off the chart', () => {
        const { chart } = mountChart();
        const { view, spies } = bandView();
        const series = chart.addCustomSeries(view);
        series.setData(bandData());
        paint(chart);
        spies.draw.mockClear();

        chart.removeSeries(series);
        paint(chart);

        expect(spies.draw).not.toHaveBeenCalled();
    });
});

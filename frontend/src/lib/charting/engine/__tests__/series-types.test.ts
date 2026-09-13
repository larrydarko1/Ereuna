import { describe, expect, it } from 'vitest';

import { mountChart, paint } from '@/lib/charting/__tests__/helpers/chart-harness';
import {
    areaData,
    barData,
    baselineData,
    candlestickData,
    histogramData,
    lineData,
    timeAt,
    withWhitespace,
} from '@/lib/charting/__tests__/helpers/market-data';
import { MismatchDirection } from '@/lib/charting/engine/model/data/plot-list';
import { LastPriceAnimationMode } from '@/lib/charting/engine/model/series/series-style-options';

describe('every series type', () => {
    it('draws on one chart together', () => {
        const { chart } = mountChart();

        chart.addCandlestickSeries().setData(candlestickData());
        chart.addBarSeries().setData(barData());
        chart.addAreaSeries().setData(areaData());
        chart.addBaselineSeries().setData(baselineData());
        chart.addHistogramSeries().setData(histogramData());
        chart.addLineSeries().setData(lineData());

        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('reports its own type back', () => {
        const { chart } = mountChart();

        expect(chart.addAreaSeries().seriesType()).toBe('Area');
        expect(chart.addBarSeries().seriesType()).toBe('Bar');
        expect(chart.addBaselineSeries().seriesType()).toBe('Baseline');
        expect(chart.addCandlestickSeries().seriesType()).toBe('Candlestick');
        expect(chart.addHistogramSeries().seriesType()).toBe('Histogram');
        expect(chart.addLineSeries().seriesType()).toBe('Line');
    });

    it('draws through the gaps whitespace leaves', () => {
        const { chart } = mountChart();

        chart.addLineSeries().setData(withWhitespace(lineData()));
        chart.addAreaSeries().setData(withWhitespace(areaData()));
        chart.addCandlestickSeries().setData(withWhitespace(candlestickData()));

        expect(paint(chart).width).toBeGreaterThan(0);
    });
});

describe('a line series', () => {
    it('hands back the data it was given', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        const data = lineData(10);

        series.setData(data);

        expect(series.data()).toHaveLength(10);
        expect(series.data()[0]).toEqual(data[0]);
    });

    it('appends a bar on update and replaces one at a time it already holds', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        series.setData(lineData(10));

        series.update({ time: timeAt(10), value: 500 });
        expect(series.data()).toHaveLength(11);

        series.update({ time: timeAt(10), value: 600 });
        expect(series.data()).toHaveLength(11);
        expect(series.dataByIndex(10)).toEqual({ time: timeAt(10), value: 600 });
    });

    it('refuses an update older than the last bar', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        series.setData(lineData(10));

        expect(() => series.update({ time: timeAt(3), value: 1 })).toThrow();
    });

    it('empties when set to nothing', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        series.setData(lineData(10));

        series.setData([]);

        expect(series.data()).toHaveLength(0);
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('tells a subscriber the data changed, once per write', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        const seen: string[] = [];
        const handler = (scope: string): void => {
            seen.push(scope);
        };

        series.subscribeDataChanged(handler);
        series.setData(lineData(5));
        series.update({ time: timeAt(5), value: 1 });
        series.unsubscribeDataChanged(handler);
        series.update({ time: timeAt(6), value: 2 });

        expect(seen).toEqual(['full', 'update']);
    });
});

describe('dataByIndex', () => {
    it('answers null past either end', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        series.setData(lineData(5));

        expect(series.dataByIndex(-10)).toBeNull();
        expect(series.dataByIndex(99)).toBeNull();
    });

    it('walks to the nearest bar in the direction it is told', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();
        // Two bars, so logical 0 and 1 are the only ones that exist — the index
        // is a position on the scale, not an offset in time
        series.setData([
            { time: timeAt(0), value: 1 },
            { time: timeAt(4), value: 2 },
        ]);

        expect(series.dataByIndex(9, MismatchDirection.NearestLeft)).toEqual({ time: timeAt(4), value: 2 });
        expect(series.dataByIndex(-9, MismatchDirection.NearestRight)).toEqual({ time: timeAt(0), value: 1 });
        expect(series.dataByIndex(9, MismatchDirection.None)).toBeNull();
    });
});

describe('series options', () => {
    it('merges a partial change into what is already set', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries({ color: '#ff0000', lineWidth: 4 });

        series.applyOptions({ lineWidth: 1 });

        expect(series.options().color).toBe('#ff0000');
        expect(series.options().lineWidth).toBe(1);
    });

    it('draws a line with each of its decorations turned on', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries({
            lineStyle: 2,
            lineType: 1,
            pointMarkersVisible: true,
            crosshairMarkerVisible: true,
            lastPriceAnimation: LastPriceAnimationMode.Continuous,
        });
        series.setData(lineData());

        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws a candlestick series with borders and wicks turned off', () => {
        const { chart } = mountChart();
        const series = chart.addCandlestickSeries({ borderVisible: false, wickVisible: false });
        series.setData(candlestickData());

        expect(paint(chart).width).toBeGreaterThan(0);
        series.applyOptions({ borderVisible: true, wickVisible: true, upColor: '#0f0', downColor: '#f00' });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws a bar series both thin and open-less', () => {
        const { chart } = mountChart();
        const series = chart.addBarSeries({ thinBars: true, openVisible: false });
        series.setData(barData());

        expect(paint(chart).width).toBeGreaterThan(0);
        series.applyOptions({ thinBars: false, openVisible: true });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws a baseline series either side of its base value', () => {
        const { chart } = mountChart();
        const series = chart.addBaselineSeries({ baseValue: { type: 'price', price: 110 } });
        series.setData(baselineData());

        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws an area series with and without an inverted fill', () => {
        const { chart } = mountChart();
        const series = chart.addAreaSeries({ invertFilledArea: true, lineVisible: false });
        series.setData(areaData());

        expect(paint(chart).width).toBeGreaterThan(0);
        series.applyOptions({ invertFilledArea: false, lineVisible: true });
        expect(paint(chart).width).toBeGreaterThan(0);
    });
});

describe('removeSeries', () => {
    it('takes the series off the chart and leaves the rest drawing', () => {
        const { chart } = mountChart();
        const kept = chart.addLineSeries();
        const dropped = chart.addAreaSeries();
        kept.setData(lineData());
        dropped.setData(areaData());

        chart.removeSeries(dropped);

        expect(paint(chart).width).toBeGreaterThan(0);
        expect(kept.data()).toHaveLength(50);
    });

    it('refuses the same series twice', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();

        chart.removeSeries(series);

        expect(() => chart.removeSeries(series)).toThrow();
    });
});

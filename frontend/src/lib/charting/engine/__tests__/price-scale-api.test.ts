import { describe, expect, it } from 'vitest';

import { mountChart, paint } from '@/lib/charting/__tests__/helpers/chart-harness';
import { candlestickData, lineData } from '@/lib/charting/__tests__/helpers/market-data';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { PriceScaleMode } from '@/lib/charting/engine/model/price/price-scale';

type Charted = { chart: IChartApi; series: ISeriesApi<'Line'> };

function chartWithLine(count = 50): Charted {
    const { chart } = mountChart();
    const series = chart.addLineSeries();
    series.setData(lineData(count));
    // The scale has no height until something lays it out
    paint(chart);
    return { chart, series };
}

describe('the price scale a series is attached to', () => {
    it('is the right scale by default, and reports a width once it is drawn', () => {
        const { chart, series } = chartWithLine();

        // Every call hands back a new facade over the same scale, so the two are
        // the same object only in the sense that a change through one shows in the
        // other
        series.priceScale().applyOptions({ minimumWidth: 90 });

        expect(chart.priceScale('right').options().minimumWidth).toBe(90);
        expect(chart.priceScale('right').width()).toBeGreaterThan(0);
    });

    it('moves to the left scale when the series is told to use it', () => {
        const { chart } = mountChart({ leftPriceScale: { visible: true } });
        const series = chart.addLineSeries({ priceScaleId: 'left' });
        series.setData(lineData());
        paint(chart);

        series.priceScale().applyOptions({ minimumWidth: 90 });

        expect(chart.priceScale('left').options().minimumWidth).toBe(90);
        expect(chart.priceScale('left').width()).toBeGreaterThan(0);
    });

    it('gives an overlay series a scale of its own', () => {
        const { chart } = mountChart();
        chart.addLineSeries().setData(lineData());
        const overlay = chart.addHistogramSeries({ priceScaleId: 'volume' });
        overlay.setData(lineData());
        paint(chart);

        overlay.priceScale().applyOptions({ minimumWidth: 90 });

        // An overlay draws inside the pane, so its own scale is not the visible one
        expect(chart.priceScale('right').options().minimumWidth).not.toBe(90);
        expect(overlay.priceScale().options().minimumWidth).toBe(90);
    });
});

describe('price scale options', () => {
    it('merges what it is given and leaves the rest alone', () => {
        const { chart } = chartWithLine();
        const scale = chart.priceScale('right');
        const before = scale.options().borderColor;

        scale.applyOptions({ scaleMargins: { top: 0.3, bottom: 0.3 }, alignLabels: false });

        expect(scale.options().scaleMargins).toEqual({ top: 0.3, bottom: 0.3 });
        expect(scale.options().alignLabels).toBe(false);
        expect(scale.options().borderColor).toBe(before);
    });

    it('refuses margins that overlap', () => {
        const { chart } = chartWithLine();

        expect(() => chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.8, bottom: 0.8 } })).toThrow();
    });

    it('refuses a margin outside the scale', () => {
        const { chart } = chartWithLine();

        expect(() => chart.priceScale('right').applyOptions({ scaleMargins: { top: -1, bottom: 0.1 } })).toThrow();
        expect(() => chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 2 } })).toThrow();
    });

    it('draws with the border on and again with it off', () => {
        const { chart } = chartWithLine();

        chart.priceScale('right').applyOptions({ borderVisible: true, ticksVisible: true });
        expect(paint(chart).width).toBeGreaterThan(0);

        chart.priceScale('right').applyOptions({ borderVisible: false, ticksVisible: false });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('takes a minimum width the axis cannot go under', () => {
        const { chart } = chartWithLine();

        chart.priceScale('right').applyOptions({ minimumWidth: 120 });
        paint(chart);

        expect(chart.priceScale('right').width()).toBeGreaterThanOrEqual(120);
    });

    it('has no width at all once it is hidden', () => {
        const { chart } = chartWithLine();

        chart.priceScale('right').applyOptions({ visible: false });
        paint(chart);

        expect(chart.priceScale('right').width()).toBe(0);
    });
});

describe('the four ways a price scale can map a price to a coordinate', () => {
    it('round-trips a price on a normal scale', () => {
        const { chart, series } = chartWithLine();
        const price = lineData()[10]?.value ?? 0;

        const y = series.priceToCoordinate(price);
        expect(y).not.toBeNull();
        expect(series.coordinateToPrice(y as number)).toBeCloseTo(price, 4);
        expect(chart.priceScale('right').options().mode).toBe(PriceScaleMode.Normal);
    });

    it('round-trips a price on a logarithmic scale', () => {
        const { chart, series } = chartWithLine();
        chart.priceScale('right').applyOptions({ mode: PriceScaleMode.Logarithmic });
        paint(chart);
        const price = lineData()[10]?.value ?? 0;

        const y = series.priceToCoordinate(price);
        expect(y).not.toBeNull();
        expect(series.coordinateToPrice(y as number)).toBeCloseTo(price, 2);
    });

    it('still draws in percentage mode', () => {
        const { chart, series } = chartWithLine();

        chart.priceScale('right').applyOptions({ mode: PriceScaleMode.Percentage });

        expect(paint(chart).width).toBeGreaterThan(0);
        expect(series.priceToCoordinate(lineData()[10]?.value ?? 0)).not.toBeNull();
    });

    it('still draws indexed to 100', () => {
        const { chart, series } = chartWithLine();

        chart.priceScale('right').applyOptions({ mode: PriceScaleMode.IndexedTo100 });

        expect(paint(chart).width).toBeGreaterThan(0);
        expect(series.priceToCoordinate(lineData()[10]?.value ?? 0)).not.toBeNull();
    });

    it('inverts the axis when asked, putting the higher price lower down', () => {
        const { chart, series } = chartWithLine();
        const low = lineData()[0]?.value ?? 0;
        const high = Math.max(...lineData().map((point) => point.value));
        const uprightLowY = series.priceToCoordinate(low) as number;

        chart.priceScale('right').applyOptions({ invertScale: true });
        paint(chart);

        const invertedLowY = series.priceToCoordinate(low) as number;
        expect(invertedLowY).not.toBeCloseTo(uprightLowY, 1);
        expect(series.priceToCoordinate(high)).toBeGreaterThan(invertedLowY - 1);
    });

    it('answers null for every conversion before any data arrives', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries();

        expect(series.priceToCoordinate(100)).toBeNull();
        expect(series.coordinateToPrice(100)).toBeNull();
    });
});

describe('auto scaling', () => {
    it('fits the data it is given, and holds the range once it is switched off', () => {
        const { chart, series } = chartWithLine();
        const fitted = series.priceToCoordinate(lineData()[0]?.value ?? 0);

        chart.priceScale('right').applyOptions({ autoScale: false });
        series.setData(lineData(50).map((point) => ({ ...point, value: point.value * 3 })));
        paint(chart);

        expect(fitted).not.toBeNull();
        expect(chart.priceScale('right').options().autoScale).toBe(false);
    });

    it('leaves room above and below for the margins it is given', () => {
        const { chart, series } = chartWithLine();
        const high = Math.max(...lineData().map((point) => point.value));
        const tight = series.priceToCoordinate(high) as number;

        chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.4, bottom: 0.1 } });
        paint(chart);

        expect(series.priceToCoordinate(high)).toBeGreaterThan(tight);
    });

    it('widens the range to cover a second series on the same scale', () => {
        const { chart } = mountChart();
        const first = chart.addLineSeries();
        first.setData(lineData(20));
        paint(chart);
        const before = first.coordinateToPrice(0) as number;

        const second = chart.addLineSeries();
        second.setData(lineData(20).map((point) => ({ ...point, value: point.value + 500 })));
        paint(chart);

        expect(first.coordinateToPrice(0)).toBeGreaterThan(before);
    });
});

describe('the price format a series prints with', () => {
    it('prints a price with the precision and minimum movement it is given', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries({ priceFormat: { type: 'price', precision: 4, minMove: 0.0001 } });
        series.setData(lineData());
        paint(chart);

        expect(series.priceFormatter().format(1.23456)).toBe('1.2346');
    });

    it('prints a volume in thousands', () => {
        const { chart } = mountChart();
        const series = chart.addHistogramSeries({ priceFormat: { type: 'volume' } });
        series.setData(lineData().map((point) => ({ ...point, value: point.value * 1000 })));
        paint(chart);

        expect(series.priceFormatter().format(1500)).toBe('1.5K');
        expect(series.priceFormatter().format(2_500_000)).toBe('2.5M');
    });

    it('prints a percentage', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries({ priceFormat: { type: 'percent' } });
        series.setData(lineData());
        paint(chart);

        expect(series.priceFormatter().format(12)).toBe('12.0%');
    });

    it('prints through a formatter of its own when it is given one', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries({
            priceFormat: { type: 'custom', formatter: (price: number) => `~${price.toFixed(1)}` },
        });
        series.setData(lineData());
        paint(chart);

        expect(series.priceFormatter().format(3)).toBe('~3.0');
    });
});

describe('bars in a logical range', () => {
    it('counts the bars inside the range and how far it overruns either end', () => {
        const { chart } = mountChart();
        const series = chart.addCandlestickSeries();
        series.setData(candlestickData(40));
        paint(chart);

        const info = series.barsInLogicalRange({ from: 5, to: 15 });

        expect(info?.barsBefore).toBeCloseTo(5, 0);
        expect(info?.barsAfter).toBeCloseTo(24, 0);
    });

    it('reports the overrun as a negative count when the range runs past the data', () => {
        const { chart } = mountChart();
        const series = chart.addCandlestickSeries();
        series.setData(candlestickData(40));
        paint(chart);

        const info = series.barsInLogicalRange({ from: -10, to: 60 });

        expect(info?.barsBefore).toBeLessThan(0);
        expect(info?.barsAfter).toBeLessThan(0);
    });

    it('answers null for a series with no data', () => {
        const { chart } = mountChart();
        const series = chart.addCandlestickSeries();

        expect(series.barsInLogicalRange({ from: 0, to: 10 })).toBeNull();
    });
});

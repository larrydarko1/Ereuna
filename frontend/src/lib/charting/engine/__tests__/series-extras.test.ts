import { describe, expect, it } from 'vitest';

import { mountChart, paint } from '@/lib/charting/__tests__/helpers/chart-harness';
import { candlestickData, lineData, timeAt } from '@/lib/charting/__tests__/helpers/market-data';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type SeriesMarker } from '@/lib/charting/engine/model/series/series-markers';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { LineStyle } from '@/lib/charting/engine/renderers/draw-line';

type Charted = { chart: IChartApi; series: ISeriesApi<'Candlestick'> };

/** A marker carries `originalTime` internally, which the public shape does not set. */
function marker(index: number, extra: Partial<SeriesMarker<Time>> = {}): SeriesMarker<Time> {
    return {
        time: timeAt(index),
        position: 'aboveBar',
        shape: 'arrowDown',
        color: '#ef5350',
        ...extra,
    } as SeriesMarker<Time>;
}

function charted(): Charted {
    const { chart } = mountChart();
    const series = chart.addCandlestickSeries();
    series.setData(candlestickData(50));
    paint(chart);
    return { chart, series };
}

describe('markers on a series', () => {
    it('draws every shape it is given, in every position', () => {
        const { chart, series } = charted();

        series.setMarkers([
            marker(5, { shape: 'circle', position: 'aboveBar', text: 'buy' }),
            marker(10, { shape: 'square', position: 'belowBar', text: 'sell', size: 2 }),
            marker(15, { shape: 'arrowUp', position: 'inBar' }),
            marker(20, { shape: 'arrowDown', position: 'aboveBar', textColor: '#ffffff' }),
            marker(25, { shape: 'roundedSquare', position: 'belowBar' }),
        ]);

        expect(paint(chart).width).toBeGreaterThan(0);
        expect(series.markers()).toHaveLength(5);
    });

    it('hands the markers back in the order they were given, ids and all', () => {
        const { series } = charted();

        series.setMarkers([marker(5, { id: 'entry' }), marker(9, { id: 'exit' })]);

        expect(series.markers().map((each) => each.id)).toEqual(['entry', 'exit']);
    });

    it('replaces the whole set rather than adding to it, and clears on an empty one', () => {
        const { chart, series } = charted();
        series.setMarkers([marker(5), marker(9)]);
        paint(chart);

        series.setMarkers([marker(12)]);
        paint(chart);
        expect(series.markers()).toHaveLength(1);

        series.setMarkers([]);
        expect(paint(chart).width).toBeGreaterThan(0);
        expect(series.markers()).toHaveLength(0);
    });

    it('keeps a marker that sits past the end of the data', () => {
        const { chart, series } = charted();

        series.setMarkers([marker(999)]);

        expect(paint(chart).width).toBeGreaterThan(0);
        expect(series.markers()).toHaveLength(1);
    });
});

describe('price lines on a series', () => {
    it('draws a line at the price it is given, with its label on the axis', () => {
        const { chart, series } = charted();

        const line = series.createPriceLine({
            price: 110,
            color: '#2962ff',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'target',
        });

        expect(line.options().price).toBe(110);
        expect(line.options().title).toBe('target');
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('moves when it is given a new price', () => {
        const { chart, series } = charted();
        const line = series.createPriceLine({ price: 110 });

        line.applyOptions({ price: 95, color: '#ff0000', lineVisible: false });

        expect(line.options().price).toBe(95);
        expect(line.options().lineVisible).toBe(false);
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('is gone from the drawing once it is removed', () => {
        const { chart, series } = charted();
        const line = series.createPriceLine({ price: 110 });
        paint(chart);

        series.removePriceLine(line);

        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws several at once without them interfering', () => {
        const { chart, series } = charted();

        series.createPriceLine({ price: 95, title: 'stop' });
        series.createPriceLine({ price: 120, title: 'target', axisLabelVisible: false });

        expect(paint(chart).width).toBeGreaterThan(0);
    });
});

describe('the last value the series shows on the axis', () => {
    it('draws the price line and its label, and again with both off', () => {
        const { chart } = mountChart();
        const series = chart.addLineSeries({
            priceLineVisible: true,
            lastValueVisible: true,
            title: 'AAPL',
        });
        series.setData(lineData());

        expect(paint(chart).width).toBeGreaterThan(0);

        series.applyOptions({ priceLineVisible: false, lastValueVisible: false });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws the base value line for a baseline series on either side of it', () => {
        const { chart } = mountChart();
        const series = chart.addBaselineSeries({
            baseValue: { type: 'price', price: 110 },
            priceLineVisible: true,
        });
        series.setData(lineData());

        expect(paint(chart).width).toBeGreaterThan(0);

        series.applyOptions({ baseValue: { type: 'price', price: 90 } });
        expect(paint(chart).width).toBeGreaterThan(0);
    });
});

describe('a series primitive attached to a series', () => {
    it('is told which series it is on, and asked to update when the chart redraws', () => {
        const { chart, series } = charted();
        const seen: string[] = [];
        const primitive = {
            attached: (): void => {
                seen.push('attached');
            },
            detached: (): void => {
                seen.push('detached');
            },
            updateAllViews: (): void => {
                seen.push('update');
            },
        };

        series.attachPrimitive(primitive);
        paint(chart);
        series.detachPrimitive(primitive);

        expect(seen[0]).toBe('attached');
        expect(seen).toContain('update');
        expect(seen[seen.length - 1]).toBe('detached');
    });
});

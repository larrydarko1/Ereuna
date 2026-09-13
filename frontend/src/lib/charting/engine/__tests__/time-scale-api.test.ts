import { describe, expect, it, vi } from 'vitest';

import { mountChart, paint } from '@/lib/charting/__tests__/helpers/chart-harness';
import { candlestickData, lineData, timeAt } from '@/lib/charting/__tests__/helpers/market-data';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';

function chartWithBars(count = 50): IChartApi {
    const { chart } = mountChart();
    chart.addCandlestickSeries().setData(candlestickData(count));
    // Layout the scale before anything reads a coordinate off it
    paint(chart);
    return chart;
}

describe('the visible range', () => {
    it('covers every bar after fitContent', () => {
        const chart = chartWithBars(30);

        chart.timeScale().fitContent();
        paint(chart);

        const range = chart.timeScale().findVisibleLogicalRange();
        expect(range?.from).toBeLessThanOrEqual(0);
        expect(range?.to).toBeGreaterThanOrEqual(29);
    });

    it('narrows to the logical range it is set to', () => {
        const chart = chartWithBars();

        chart.timeScale().setVisibleLogicalRange({ from: 10, to: 20 });
        paint(chart);

        const range = chart.timeScale().findVisibleLogicalRange();
        expect(range?.from).toBeCloseTo(10, 0);
        expect(range?.to).toBeCloseTo(20, 0);
    });

    it('narrows to the time range it is set to', () => {
        const chart = chartWithBars();

        chart.timeScale().setVisibleRange({ from: timeAt(5), to: timeAt(15) });
        paint(chart);

        const range = chart.timeScale().findVisibleRange();
        expect(range?.from).toBe(timeAt(5));
        expect(range?.to).toBe(timeAt(15));
    });

    it('refuses a range that runs backwards', () => {
        const chart = chartWithBars();

        expect(() => chart.timeScale().setVisibleLogicalRange({ from: 20, to: 10 })).toThrow();
    });

    it('has no range at all before any data arrives', () => {
        const { chart } = mountChart();

        expect(chart.timeScale().findVisibleRange()).toBeNull();
        expect(chart.timeScale().findVisibleLogicalRange()).toBeNull();
    });

    it('resets back to the default offset', () => {
        const chart = chartWithBars();
        chart.timeScale().setVisibleLogicalRange({ from: 0, to: 5 });
        paint(chart);

        chart.timeScale().resetTimeScale();
        paint(chart);

        expect(chart.timeScale().findVisibleLogicalRange()?.to).toBeGreaterThan(5);
    });
});

describe('scrolling', () => {
    it('moves the scroll position by the bars it is given', () => {
        const chart = chartWithBars();

        chart.timeScale().scrollToPosition(-10);
        paint(chart);

        expect(chart.timeScale().scrollPosition()).toBeCloseTo(-10, 5);
    });

    it('returns to the right edge on scrollToRealTime', () => {
        const chart = chartWithBars();
        chart.timeScale().scrollToPosition(-30);
        paint(chart);

        chart.timeScale().scrollToRealTime();
        paint(chart);

        expect(chart.timeScale().scrollPosition()).toBeGreaterThan(-30);
    });

    it('animates towards the position it is asked to scroll to', () => {
        vi.useFakeTimers();
        const chart = chartWithBars();

        chart.timeScale().scrollToPositionAnimated(-20);
        vi.advanceTimersByTime(500);
        paint(chart);

        expect(chart.timeScale().scrollPosition()).toBeLessThan(0);
        vi.useRealTimers();
    });
});

describe('converting between a coordinate and a point on the scale', () => {
    it('round-trips a logical index', () => {
        const chart = chartWithBars();

        const x = chart.timeScale().logicalToCoordinate(12 as never);
        expect(x).not.toBeNull();
        expect(chart.timeScale().coordinateToLogical(x as number)).toBeCloseTo(12, 5);
    });

    it('round-trips a time that is on a bar', () => {
        const chart = chartWithBars();

        const x = chart.timeScale().timeToCoordinate(timeAt(12));
        expect(x).not.toBeNull();
        expect(chart.timeScale().coordinateToTime(x as number)).toBe(timeAt(12));
    });

    it('answers null for a time no bar sits on', () => {
        const chart = chartWithBars();

        expect(chart.timeScale().timeToCoordinate(timeAt(999))).toBeNull();
    });

    it('answers null for every conversion while the scale is empty', () => {
        const { chart } = mountChart();

        expect(chart.timeScale().logicalToCoordinate(0 as never)).toBeNull();
        expect(chart.timeScale().coordinateToLogical(100)).toBeNull();
        expect(chart.timeScale().timeToCoordinate(timeAt(0))).toBeNull();
        expect(chart.timeScale().coordinateToTime(100)).toBeNull();
    });
});

describe('time scale options', () => {
    it('draws the axis with times, seconds and a border, and again with none of them', () => {
        const chart = chartWithBars();

        chart.timeScale().applyOptions({ timeVisible: true, secondsVisible: true, borderVisible: true });
        expect(paint(chart).width).toBeGreaterThan(0);

        chart.timeScale().applyOptions({ timeVisible: false, secondsVisible: false, borderVisible: false });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('pins both edges when asked to fix them', () => {
        const chart = chartWithBars();

        chart.timeScale().applyOptions({ fixLeftEdge: true, fixRightEdge: true, rightOffset: 0 });
        chart.timeScale().scrollToPosition(-100);
        paint(chart);

        expect(chart.timeScale().findVisibleLogicalRange()?.from).toBeGreaterThanOrEqual(0);
    });

    it('widens the bars when barSpacing goes up', () => {
        const chart = chartWithBars();
        chart.timeScale().applyOptions({ barSpacing: 6 });
        paint(chart);
        const narrow = chart.timeScale().findVisibleLogicalRange();

        chart.timeScale().applyOptions({ barSpacing: 24 });
        paint(chart);
        const wide = chart.timeScale().findVisibleLogicalRange();

        const span = (range: { from: number; to: number } | null): number =>
            range === null ? 0 : range.to - range.from;
        expect(span(wide)).toBeLessThan(span(narrow));
    });

    it('hides the axis entirely when told to', () => {
        const chart = chartWithBars();

        chart.timeScale().applyOptions({ visible: false });

        expect(paint(chart).width).toBeGreaterThan(0);
        expect(chart.timeScale().options().visible).toBe(false);
    });

    it('reports its own width and height', () => {
        const chart = chartWithBars();

        expect(chart.timeScale().width()).toBeGreaterThan(0);
        expect(chart.timeScale().height()).toBeGreaterThan(0);
    });
});

describe('time scale subscriptions', () => {
    it('tells a subscriber when the visible range moves, until it unsubscribes', () => {
        const chart = chartWithBars();
        const seen: number[] = [];
        const handler = (): void => {
            seen.push(1);
        };

        chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
        chart.timeScale().setVisibleLogicalRange({ from: 5, to: 15 });
        paint(chart);
        const afterFirst = seen.length;

        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
        chart.timeScale().setVisibleLogicalRange({ from: 1, to: 10 });
        paint(chart);

        expect(afterFirst).toBeGreaterThan(0);
        expect(seen).toHaveLength(afterFirst);
    });

    it('tells a subscriber when the visible time range moves', () => {
        const chart = chartWithBars();
        const seen: unknown[] = [];

        chart.timeScale().subscribeVisibleTimeRangeChange((range) => seen.push(range));
        chart.timeScale().setVisibleRange({ from: timeAt(5), to: timeAt(15) });
        paint(chart);

        expect(seen.length).toBeGreaterThan(0);
    });

    it('tells a subscriber when the chart is resized', () => {
        const chart = chartWithBars();
        const sizes: number[] = [];

        chart.timeScale().subscribeSizeChange((width) => sizes.push(width));
        chart.resize(800, 500);
        paint(chart);

        expect(sizes.length).toBeGreaterThan(0);
    });
});

describe('a second series on the same scale', () => {
    it('extends the range to cover whichever ends last', () => {
        const { chart } = mountChart();
        chart.addLineSeries().setData(lineData(10));
        chart.addLineSeries().setData(lineData(40));

        chart.timeScale().fitContent();
        paint(chart);

        expect(chart.timeScale().findVisibleLogicalRange()?.to).toBeGreaterThanOrEqual(39);
    });
});

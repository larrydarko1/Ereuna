import { describe, expect, it, vi } from 'vitest';

import { type ChartSurfaces, mountChart, paint, surfacesOf } from '@/lib/charting/__tests__/helpers/chart-harness';
import { candlestickData, lineData } from '@/lib/charting/__tests__/helpers/market-data';
import { click, doubleClick, drag, mouse, touch, touchDrag, wheel } from '@/lib/charting/__tests__/helpers/pointer';
import { type DeepPartial } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type ChartOptions, type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type MouseEventParams } from '@/lib/charting/engine/api/ichart-api';

type Driven = { chart: IChartApi; surfaces: ChartSurfaces };

const MIDDLE = { x: 300, y: 200 };

function span(range: { from: number; to: number } | null): number {
    return range === null ? 0 : range.to - range.from;
}

function driven(options?: DeepPartial<ChartOptions>): Driven {
    const { chart } = mountChart(options);
    chart.addCandlestickSeries().setData(candlestickData(50));
    paint(chart);
    const surfaces = surfacesOf(chart);
    // A move is only listened for once the pointer has entered — the handler binds
    // `mousemove` inside its `mouseenter`
    mouse(surfaces.pane, 'mouseenter', MIDDLE);
    return { chart, surfaces };
}

describe('the crosshair follows the mouse', () => {
    it('reports the bar and the series value under the pointer', () => {
        const { chart, surfaces } = driven();
        const seen: MouseEventParams[] = [];
        chart.subscribeCrosshairMove((param) => seen.push(param));

        mouse(surfaces.pane, 'mousemove', MIDDLE);

        const last = seen[seen.length - 1];
        expect(seen.length).toBeGreaterThan(0);
        expect(last?.point).toBeDefined();
        expect(last?.time).toBeDefined();
        expect(last?.seriesData.size).toBe(1);
    });

    it('reports an empty position once the pointer leaves', () => {
        const { chart, surfaces } = driven();
        const seen: MouseEventParams[] = [];
        mouse(surfaces.pane, 'mousemove', MIDDLE);
        chart.subscribeCrosshairMove((param) => seen.push(param));

        mouse(surfaces.pane, 'mouseleave', MIDDLE);

        expect(seen[seen.length - 1]?.point).toBeUndefined();
    });

    it('stops reporting once the handler is taken off', () => {
        const { chart, surfaces } = driven();
        const handler = vi.fn();
        chart.subscribeCrosshairMove(handler);
        mouse(surfaces.pane, 'mousemove', MIDDLE);
        const after = handler.mock.calls.length;

        chart.unsubscribeCrosshairMove(handler);
        mouse(surfaces.pane, 'mousemove', { x: 320, y: 210 });

        expect(after).toBeGreaterThan(0);
        expect(handler).toHaveBeenCalledTimes(after);
    });

    it('draws with the lines and their labels on, and again with them off', () => {
        const { chart, surfaces } = driven();

        for (const width of [1, 2] as const) {
            chart.applyOptions({
                crosshair: {
                    vertLine: { visible: true, labelVisible: true, width },
                    horzLine: { visible: true, labelVisible: true },
                },
            });
            mouse(surfaces.pane, 'mousemove', MIDDLE);
            expect(paint(chart).width).toBeGreaterThan(0);
        }

        chart.applyOptions({ crosshair: { vertLine: { visible: false }, horzLine: { visible: false } } });
        mouse(surfaces.pane, 'mousemove', MIDDLE);
        expect(paint(chart).width).toBeGreaterThan(0);
    });
});

describe('clicking the pane', () => {
    it('tells a click subscriber where the pointer was, until it unsubscribes', () => {
        const { chart, surfaces } = driven();
        const handler = vi.fn();
        chart.subscribeClick(handler);

        click(surfaces.pane, MIDDLE);

        expect(handler).toHaveBeenCalled();
        chart.unsubscribeClick(handler);
        const after = handler.mock.calls.length;
        click(surfaces.pane, MIDDLE);
        expect(handler).toHaveBeenCalledTimes(after);
    });

    it('tells a double click subscriber, until it unsubscribes', () => {
        const { chart, surfaces } = driven();
        const handler = vi.fn();
        chart.subscribeDblClick(handler);

        doubleClick(surfaces.pane, MIDDLE);

        expect(handler).toHaveBeenCalledTimes(1);
        chart.unsubscribeDblClick(handler);
        doubleClick(surfaces.pane, MIDDLE);
        expect(handler).toHaveBeenCalledTimes(1);
    });
});

describe('dragging', () => {
    it('scrolls the time scale sideways', () => {
        const { chart, surfaces } = driven();
        const before = chart.timeScale().scrollPosition();

        drag(surfaces.pane, { x: 400, y: 200 }, { x: 200, y: 200 });
        paint(chart);

        expect(chart.timeScale().scrollPosition()).not.toBeCloseTo(before, 3);
    });

    it('leaves the scale alone when scrolling by pressed mouse is switched off', () => {
        const { chart, surfaces } = driven({ handleScroll: { pressedMouseMove: false, horzTouchDrag: false } });
        const before = chart.timeScale().scrollPosition();

        drag(surfaces.pane, { x: 400, y: 200 }, { x: 200, y: 200 });
        paint(chart);

        expect(chart.timeScale().scrollPosition()).toBeCloseTo(before, 5);
    });

    it('changes the bar spacing when the time axis itself is dragged', () => {
        const { chart, surfaces } = driven();
        const before = chart.timeScale().options().barSpacing;

        drag(surfaces.timeAxis, { x: 400, y: 10 }, { x: 200, y: 10 });
        paint(chart);

        expect(chart.timeScale().options().barSpacing).not.toBe(before);
    });

    it('stretches the price scale when the price axis is dragged', () => {
        const { chart, surfaces } = driven();
        const series = chart.addLineSeries();
        series.setData(lineData(50));
        paint(chart);
        chart.priceScale('right').applyOptions({ autoScale: false });
        const before = series.coordinateToPrice(10);

        drag(surfaces.priceAxis, { x: 10, y: 100 }, { x: 10, y: 300 });
        paint(chart);

        expect(series.coordinateToPrice(10)).not.toBe(before);
    });

    it('resets the price scale on a double click of the price axis', () => {
        const { chart, surfaces } = driven();
        chart.priceScale('right').applyOptions({ autoScale: false });

        doubleClick(surfaces.priceAxis, { x: 10, y: 200 });
        paint(chart);

        expect(chart.priceScale('right').options().autoScale).toBe(true);
    });
});

describe('the wheel', () => {
    it('zooms the time scale in, so fewer bars are visible than before', () => {
        const { chart, surfaces } = driven();
        const before = chart.timeScale().findVisibleLogicalRange();

        wheel(surfaces.pane, MIDDLE, -100);
        paint(chart);

        const after = chart.timeScale().findVisibleLogicalRange();
        expect(span(after)).toBeLessThan(span(before));
    });

    it('is ignored entirely when scaling by wheel is switched off', () => {
        const { chart, surfaces } = driven({ handleScale: { mouseWheel: false } });
        const before = chart.timeScale().findVisibleLogicalRange();

        wheel(surfaces.pane, MIDDLE, -100);
        paint(chart);

        expect(chart.timeScale().findVisibleLogicalRange()?.from).toBeCloseTo(before?.from ?? 0, 5);
    });
});

describe('touch', () => {
    it('scrolls on a one finger drag', () => {
        const { chart, surfaces } = driven();
        const before = chart.timeScale().scrollPosition();

        touchDrag(surfaces.pane, { x: 400, y: 200 }, { x: 200, y: 200 });
        paint(chart);

        expect(chart.timeScale().scrollPosition()).not.toBeCloseTo(before, 3);
    });

    it('survives a pinch with two fingers', () => {
        const { chart, surfaces } = driven();

        touch(surfaces.pane, 'touchstart', [
            { x: 250, y: 200 },
            { x: 350, y: 200 },
        ]);
        touch(surfaces.pane, 'touchmove', [
            { x: 200, y: 200 },
            { x: 400, y: 200 },
        ]);
        touch(surfaces.pane, 'touchend', [
            { x: 200, y: 200 },
            { x: 400, y: 200 },
        ]);

        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('survives a cancelled touch', () => {
        const { chart, surfaces } = driven();

        touch(surfaces.pane, 'touchstart', [{ x: 300, y: 200 }]);
        touch(surfaces.pane, 'touchcancel', [{ x: 300, y: 200 }]);

        expect(paint(chart).width).toBeGreaterThan(0);
    });
});

describe('a chart with every interaction switched off', () => {
    it('ignores the wheel, a drag and a touch alike', () => {
        const { chart, surfaces } = driven({
            handleScroll: false,
            handleScale: false,
            kineticScroll: { mouse: false, touch: false },
        });
        const before = chart.timeScale().scrollPosition();

        wheel(surfaces.pane, MIDDLE, -100);
        drag(surfaces.pane, { x: 400, y: 200 }, { x: 200, y: 200 });
        touchDrag(surfaces.pane, { x: 400, y: 200 }, { x: 200, y: 200 });
        paint(chart);

        expect(chart.timeScale().scrollPosition()).toBeCloseTo(before, 5);
    });
});

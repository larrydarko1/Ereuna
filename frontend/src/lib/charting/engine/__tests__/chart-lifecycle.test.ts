import { describe, expect, it } from 'vitest';

import {
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    mountChart,
    paint,
    pinSize,
    removeChart,
} from '@/lib/charting/__tests__/helpers/chart-harness';
import { candlestickData, lineData } from '@/lib/charting/__tests__/helpers/market-data';
import { createChart } from '@/lib/charting/engine/api/create-chart';
import { ColorType } from '@/lib/charting/engine/model/chart/layout-options';
import { CrosshairMode } from '@/lib/charting/engine/model/chart/crosshair';

describe('createChart', () => {
    it('builds its widget tree inside the container it is given', () => {
        const { chart, container } = mountChart();

        expect(container.querySelector('.tv-lightweight-charts')).toBe(chart.chartElement());
        expect(container.querySelectorAll('canvas').length).toBeGreaterThan(0);
    });

    it('accepts the container by id as well as by element', () => {
        const container = document.createElement('div');
        container.id = 'chart-by-id';
        pinSize(container, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        document.body.appendChild(container);

        const chart = createChart('chart-by-id', { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

        expect(chart.chartElement().parentElement).toBe(container);
        chart.remove();
        container.remove();
    });

    it('refuses an id that is not in the document', () => {
        expect(() => createChart('no-such-container')).toThrow();
    });

    it('reports the size it was asked for', () => {
        const { chart } = mountChart({ width: 800, height: 300 });

        expect(chart.paneSize().width + chart.priceScale('right').width()).toBe(800);
        expect(chart.paneSize().height + chart.timeScale().height()).toBe(300);
    });
});

describe('resize', () => {
    it('moves the pane to the new size', () => {
        const { chart } = mountChart();
        chart.addLineSeries().setData(lineData());
        const before = chart.paneSize();

        chart.resize(900, 500);
        // A resize only invalidates; the pane is laid out again on the next draw,
        // which a synchronous test has to ask for
        paint(chart);

        expect(chart.paneSize().width).toBeGreaterThan(before.width);
        expect(chart.paneSize().height).toBeGreaterThan(before.height);
    });

    it('ignores a resize to the size it already is', () => {
        const { chart } = mountChart({ width: 640, height: 480 });
        const before = chart.paneSize();

        chart.resize(640, 480);

        expect(chart.paneSize()).toEqual(before);
    });

    it('answers autoSizeActive by whether it was asked to size itself', () => {
        expect(mountChart().chart.autoSizeActive()).toBe(false);
        expect(mountChart({ autoSize: true }).chart.autoSizeActive()).toBe(true);
    });
});

describe('remove', () => {
    it('takes the widget out of the document', () => {
        const mount = mountChart();
        mount.chart.addLineSeries().setData(lineData());
        const { container } = mount;

        removeChart(mount);

        expect(container.children).toHaveLength(0);
    });

    it('refuses to build anything more once it is gone', () => {
        const mount = mountChart();

        removeChart(mount);

        expect(() => mount.chart.addLineSeries()).toThrow();
        expect(() => mount.chart.takeScreenshot()).toThrow();
    });
});

describe('chart options', () => {
    it('merges a partial change into what is already set', () => {
        const { chart } = mountChart();

        chart.applyOptions({ crosshair: { mode: CrosshairMode.Normal } });

        expect(chart.options().crosshair.mode).toBe(CrosshairMode.Normal);
        expect(chart.options().width).toBe(DEFAULT_WIDTH);
    });

    it('draws on a solid background and on a gradient', () => {
        const { chart } = mountChart({
            layout: { background: { type: ColorType.Solid, color: '#101418' }, textColor: '#d1d4dc' },
        });
        chart.addCandlestickSeries().setData(candlestickData());
        expect(paint(chart).width).toBeGreaterThan(0);

        chart.applyOptions({
            layout: { background: { type: ColorType.VerticalGradient, topColor: '#101418', bottomColor: '#1c2530' } },
        });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws with each grid line hidden and shown again', () => {
        const { chart } = mountChart({
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        });
        chart.addLineSeries().setData(lineData());
        expect(paint(chart).width).toBeGreaterThan(0);

        chart.applyOptions({
            grid: { vertLines: { visible: true, color: '#222', style: 2 }, horzLines: { visible: true } },
        });
        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('draws a watermark when one is turned on', () => {
        const { chart } = mountChart({
            watermark: {
                visible: true,
                text: 'EREUNA',
                color: '#334',
                fontSize: 32,
                horzAlign: 'left',
                vertAlign: 'top',
            },
        });
        chart.addLineSeries().setData(lineData());

        expect(paint(chart).width).toBeGreaterThan(0);
    });

    it('spreads a single boolean for handleScroll and handleScale over every switch it holds', () => {
        const { chart } = mountChart({ handleScroll: false, handleScale: false });

        expect(chart.options().handleScroll).toMatchObject({ mouseWheel: false, pressedMouseMove: false });
        expect(chart.options().handleScale).toMatchObject({ mouseWheel: false, pinch: false });

        chart.applyOptions({ handleScroll: true, handleScale: true });

        expect(chart.options().handleScroll).toMatchObject({ mouseWheel: true, pressedMouseMove: true });
        expect(chart.options().handleScale).toMatchObject({ mouseWheel: true, pinch: true });
    });

    it('spreads the two axis behaviours over both axes when given as booleans', () => {
        const { chart } = mountChart({
            handleScale: { axisPressedMouseMove: false, axisDoubleClickReset: false },
        });

        expect(chart.options().handleScale).toMatchObject({
            axisPressedMouseMove: { time: false, price: false },
            axisDoubleClickReset: { time: false, price: false },
        });
    });

    it('refuses a size set through applyOptions while it is sizing itself', () => {
        const { chart } = mountChart({ autoSize: true });

        expect(() => chart.applyOptions({ width: 100 })).toThrow(/autoSize/);
        expect(chart.autoSizeActive()).toBe(true);
    });
});

describe('takeScreenshot', () => {
    it('draws the whole widget onto one canvas the size of the chart', () => {
        const { chart } = mountChart({ width: 700, height: 350 });
        chart.addCandlestickSeries().setData(candlestickData());

        const shot = chart.takeScreenshot();

        expect(shot.width).toBe(700);
        expect(shot.height).toBe(350);
    });
});

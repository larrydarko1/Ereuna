/**
 * A chart with a series on it and a pointer that can reach it, which is what
 * every drawing tool needs before it can be driven.
 *
 * The tools do not listen to the DOM themselves: they subscribe to the chart's
 * own click and crosshair events, so the only honest way to drive one is to
 * dispatch real mouse events at the pane and let the engine turn them into the
 * time and price the tool stores. That also means the pane has to have been
 * painted first — a crosshair over a chart with no layout reports no bar.
 */
import { afterEach, beforeEach, vi } from 'vitest';

import {
    type ChartSurfaces,
    mountChart,
    paint,
    pinSize,
    surfacesOf,
} from '@/lib/charting/__tests__/helpers/chart-harness';
import { candlestickData } from '@/lib/charting/__tests__/helpers/market-data';
import { click, mouse } from '@/lib/charting/__tests__/helpers/pointer';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';

export type DrawingStage = {
    chart: IChartApi;
    series: ISeriesApi<SeriesType>;
    surfaces: ChartSurfaces;
};

/** The tokens the tools paint with. jsdom resolves no stylesheet, so they are set by hand. */
const THEME_TOKENS: Record<string, string> = {
    '--color-bg': '#131722',
    '--color-surface': '#1e222d',
    '--color-elevated': '#2a2e39',
    '--color-text': '#d1d4dc',
    '--color-text-muted': '#787b86',
    '--color-text-inverted': '#131722',
    '--color-positive': '#26a69a',
    '--color-negative': '#ef5350',
};

beforeEach(() => {
    for (const [token, value] of Object.entries(THEME_TOKENS)) {
        document.documentElement.style.setProperty(token, value);
    }

    // Only the timeouts: the engine reads `performance.now` and schedules frames,
    // and a test that froze those would be measuring a chart that never moves
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
    vi.useRealTimers();
    for (const token of Object.keys(THEME_TOKENS)) {
        document.documentElement.style.removeProperty(token);
    }
});

export function stage(): DrawingStage {
    const { chart } = mountChart();
    const series = chart.addCandlestickSeries();
    series.setData(candlestickData(60));

    // Spread the bars over the whole pane, so that every x a test picks lands on
    // one — off the end of the data there is no time, and a tool stores nothing
    chart.timeScale().fitContent();
    paint(chart);

    // A tool sizes its overlay off the chart element, which jsdom measures as zero
    pinSize(chart.chartElement(), 600, 400);

    const surfaces = surfacesOf(chart);

    // Entering and then one move: the crosshair reports no time on the very first
    // move after an enter, and a tool that read that one would store nothing
    mouse(surfaces.pane, 'mouseenter', { x: 1, y: 1 });
    mouse(surfaces.pane, 'mousemove', { x: 1, y: 1 });
    return { chart, series, surfaces };
}

/** Moves the crosshair to a point on the pane, which is what a tool previews from. */
export function moveTo(drawing: DrawingStage, x: number, y: number): void {
    mouse(drawing.surfaces.pane, 'mousemove', { x, y });
}

/**
 * Clicks a point on the pane. A tool sees the crosshair move first and the click
 * after, the same order the engine reports them in to a real pointer.
 */
export function clickAt(drawing: DrawingStage, x: number, y: number): void {
    moveTo(drawing, x, y);
    click(drawing.surfaces.pane, { x, y });
}

export type CanvasRecording = { calls: { method: string; args: unknown[] }[]; restore: () => void };

/**
 * Records every 2d context call made from now on.
 *
 * A tool that keeps nothing — the ruler is the one — says what it worked out only
 * by drawing it, so reading its output means watching the context. Install this
 * before the tool is built: the context it paints through is the one it took at
 * construction, and a later wrapper would never reach it.
 */
export function recordCanvas(): CanvasRecording {
    const calls: { method: string; args: unknown[] }[] = [];
    const original = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, ...args: never[]): unknown {
        const context = (original as (...a: never[]) => unknown).apply(this, args);
        if (context === null || typeof context !== 'object') return context;

        return new Proxy(context as Record<string, unknown>, {
            get(target: Record<string, unknown>, property: string | symbol): unknown {
                const value = target[property as string];
                if (typeof value !== 'function') return value;

                return (...callArgs: unknown[]): unknown => {
                    calls.push({ method: String(property), args: callArgs });
                    return (value as (...a: unknown[]) => unknown).apply(target, callArgs);
                };
            },
        });
    } as typeof HTMLCanvasElement.prototype.getContext;

    return {
        calls,
        restore: (): void => {
            HTMLCanvasElement.prototype.getContext = original;
        },
    };
}

/** Presses a key at the document, where the tools listen for Delete. */
export function pressKey(key: string, target: EventTarget = document.body): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

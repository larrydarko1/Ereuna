/** Bar transforms the renderer needs but the API has no reason to compute. */
import type { ChartBar, ChartPoint } from '@/composables/charts/useChartSeries';
import type { ChartQuote } from '@/constants/chart';

/**
 * Heikin-Ashi bars: the same series with each body averaged into its neighbour.
 * Close is the mean of the four prices, open is the midpoint of the previous
 * Heikin-Ashi bar, and the wicks are stretched to cover both. The first bar has
 * no predecessor, so its open seeds from the real bar's own open and close.
 * This is a rendering, not a different series — the volume, the overlays and
 * the markers still belong to the prices underneath.
 */
export function heikinAshi(bars: readonly ChartBar[]): ChartBar[] {
    const result: ChartBar[] = [];
    let previousOpen = 0;
    let previousClose = 0;

    for (const [index, bar] of bars.entries()) {
        const close = (bar.open + bar.high + bar.low + bar.close) / 4;
        const open = index === 0 ? (bar.open + bar.close) / 2 : (previousOpen + previousClose) / 2;

        result.push({
            time: bar.time,
            open,
            high: Math.max(bar.high, open, close),
            low: Math.min(bar.low, open, close),
            close,
        });

        previousOpen = open;
        previousClose = close;
    }

    return result;
}

/** Closing prices, for the series types that draw one line instead of a body. */
export function closes(bars: readonly ChartBar[]): ChartPoint[] {
    return bars.map((bar) => ({ time: bar.time, value: bar.close }));
}

/**
 * The bar at `index` (the last one when null) with its move against the bar before it.
 * A first bar has nothing to move against, so there is no quote for it.
 */
export function findQuote(bars: readonly ChartBar[], index: number | null): ChartQuote | null {
    const at = index ?? bars.length - 1;
    const current = bars[at];
    const previous = bars[at - 1];
    if (current === undefined || previous === undefined) return null;

    const change = current.close - previous.close;
    return {
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close,
        change,
        changePercent: previous.close === 0 ? 0 : (change / previous.close) * 100,
    };
}

/**
 * How each bar's volume compares to the average of the window before it.
 * A bar trading more than twice its recent average is worth seeing, so it is
 * given the accent colour; everything else is the muted volume colour.
 * The window is trailing and capped, so early bars are compared against what
 * there is rather than against nothing.
 */
export function relativeVolume(
    points: readonly ChartPoint[],
    options: { window: number; normal: string; heavy: string },
): (ChartPoint & { color: string })[] {
    let sum = 0;
    const trailing: number[] = [];

    return points.map((point) => {
        trailing.push(point.value);
        sum += point.value;
        if (trailing.length > options.window) sum -= trailing.shift() ?? 0;

        const average = sum / trailing.length;
        const heavy = average > 0 && point.value / average > 2;
        return { ...point, color: heavy ? options.heavy : options.normal };
    });
}

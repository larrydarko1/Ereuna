/**
 * Moving-average overlays for chart data.
 * Both run in one pass — SMA on a rolling sum, EMA on its recurrence — rather
 * than re-slicing the window per bar, which is what made the old versions
 * O(bars × period) on a series that can be 1,250 bars long.
 * Pure: a close series in, a point series out. Both return an empty series when
 * there are fewer bars than the period, because a partial window is not an
 * average of that period and plotting it would misstate the indicator.
 */

export type SeriesPoint = {
    time: string;
    value: number;
};

export type Bar = {
    time: string;
    close: number;
};

/** Simple moving average. */
export function sma(bars: readonly Bar[], period: number): SeriesPoint[] {
    if (period <= 0 || bars.length < period) return [];

    const points: SeriesPoint[] = [];
    let window = 0;

    for (let i = 0; i < bars.length; i += 1) {
        window += bars[i]?.close ?? 0;
        if (i >= period) window -= bars[i - period]?.close ?? 0;
        if (i >= period - 1) points.push({ time: bars[i]?.time ?? '', value: round2(window / period) });
    }

    return points;
}

/**
 * Exponential moving average, seeded with the SMA of the first `period` bars.
 * The seed matters: starting from the first close instead makes the early
 * values depend almost entirely on one bar and takes several periods to decay.
 */
export function ema(bars: readonly Bar[], period: number): SeriesPoint[] {
    if (period <= 0 || bars.length < period) return [];

    const multiplier = 2 / (period + 1);
    let value = 0;
    for (let i = 0; i < period; i += 1) value += bars[i]?.close ?? 0;
    value /= period;

    const points: SeriesPoint[] = [{ time: bars[period - 1]?.time ?? '', value: round2(value) }];

    for (let i = period; i < bars.length; i += 1) {
        value = (bars[i]?.close ?? 0) * multiplier + value * (1 - multiplier);
        points.push({ time: bars[i]?.time ?? '', value: round2(value) });
    }

    return points;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

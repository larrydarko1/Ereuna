/**
 * Indicator maths. Pure, no I/O, no database.
 * Every function here takes a series in ASCENDING time order — oldest first,
 * newest last — and every caller sorts that way. 
 */

export function sma(values: readonly number[], period: number): number | null {
    if (period <= 0 || values.length < period) return null;
    const window = values.slice(values.length - period);
    return window.reduce((sum, value) => sum + value, 0) / period;
}

export function ema(values: readonly number[], period: number): number[] {
    if (values.length === 0 || period <= 0) return [];
    const multiplier = 2 / (period + 1);
    const out: number[] = [values[0] ?? 0];

    for (let index = 1; index < values.length; index += 1) {
        const value = values[index] ?? 0;
        const previous = out[index - 1] ?? 0;
        out.push(value * multiplier + previous * (1 - multiplier));
    }

    return out;
}

export function rsi(closes: readonly number[], period = 14): number | null {
    if (closes.length < period + 1) return null;

    const window = closes.slice(closes.length - (period + 1));
    let gains = 0;
    let losses = 0;

    for (let index = 1; index < window.length; index += 1) {
        const change = (window[index] ?? 0) - (window[index - 1] ?? 0);
        if (change > 0) gains += change;
        else losses -= change;
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;

    // No down days: the index is pinned at its ceiling, not undefined
    if (averageLoss === 0) return averageGain === 0 ? 50 : 100;

    return 100 - 100 / (1 + averageGain / averageLoss);
}

export type MacdSeries = {
    macd: number[];
    signal: number[];
};

export function macd(closes: readonly number[], fast = 12, slow = 26, signalPeriod = 9): MacdSeries | null {
    if (closes.length < slow) return null;

    const fastEma = ema(closes, fast);
    const slowEma = ema(closes, slow);
    const line = fastEma.map((value, index) => value - (slowEma[index] ?? 0));

    return { macd: line, signal: ema(line, signalPeriod) };
}

export function standardDeviation(values: readonly number[]): number | null {
    if (values.length === 0) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

export function averageDailyVolatility(closes: readonly number[], period: number): number | null {
    if (closes.length < period + 1) return null;

    const window = closes.slice(closes.length - (period + 1));
    const returns: number[] = [];

    for (let index = 1; index < window.length; index += 1) {
        const previous = window[index - 1] ?? 0;
        if (previous === 0) continue;
        returns.push(((window[index] ?? 0) - previous) / previous);
    }

    if (returns.length < period) return null;
    const deviation = standardDeviation(returns);
    return deviation === null ? null : deviation * 100;
}

export function changeOver(closes: readonly number[], bars: number): number | null {
    if (closes.length <= bars) return null;
    const latest = closes[closes.length - 1];
    const earlier = closes[closes.length - 1 - bars];
    if (latest === undefined || earlier === undefined || earlier === 0) return null;
    return (latest - earlier) / earlier;
}

export const MIN_CAGR_YEARS = 0.25;

export function cagr(startPrice: number, endPrice: number, years: number): number | null {
    if (startPrice <= 0 || endPrice <= 0 || years < MIN_CAGR_YEARS) return null;
    const rate = (endPrice / startPrice) ** (1 / years) - 1;
    // A rate outside this band is bad reference data, not a return: it comes
    // from an unadjusted split or a placeholder price, never from the market
    return rate < -0.99 || rate > 50 ? null : rate;
}

/** Highest and lowest of a series, or nulls when it is empty. */
export function extremes(values: readonly number[]): { high: number | null; low: number | null } {
    if (values.length === 0) return { high: null, low: null };

    let high = -Infinity;
    let low = Infinity;
    for (const value of values) {
        if (value > high) high = value;
        if (value < low) low = value;
    }

    return { high, low };
}

/** A finite number, or null. */
export function numeric(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** `value` rounded to `places` decimals, preserving null. */
export function round(value: number | null, places: number): number | null {
    if (value === null || !Number.isFinite(value)) return null;
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
}

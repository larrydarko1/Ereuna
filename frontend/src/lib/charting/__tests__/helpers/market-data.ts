/**
 * Deterministic series data.
 *
 * Every factory walks one bar a day from the same epoch and shapes the price with
 * a sine, so a test can assert on an exact coordinate and two runs agree. Random
 * data would make a coordinate assertion either impossible or meaningless.
 */
import {
    type AreaData,
    type BarData,
    type BaselineData,
    type CandlestickData,
    type HistogramData,
    type LineData,
    type WhitespaceData,
} from '@/lib/charting/engine/model/data/data-consumer';
import { type Time, type UTCTimestamp } from '@/lib/charting/engine/model/time/types';

/** 2023-11-14T22:13:20Z, a Tuesday — no weekend edge on the first bar. */
const FIRST_TIME = 1700000000 as UTCTimestamp;

const DAY = 86400;

/** The `n`th bar's timestamp, so a test can name a time without arithmetic. */
export function timeAt(index: number): UTCTimestamp {
    return (FIRST_TIME + index * DAY) as UTCTimestamp;
}

export function lineData(count = 50): LineData<Time>[] {
    return Array.from({ length: count }, (_, i) => ({ time: timeAt(i), value: priceAt(i) }));
}

export function areaData(count = 50): AreaData<Time>[] {
    return lineData(count);
}

export function baselineData(count = 50): BaselineData<Time>[] {
    return lineData(count);
}

export function histogramData(count = 50): HistogramData<Time>[] {
    return Array.from({ length: count }, (_, i) => ({
        time: timeAt(i),
        value: priceAt(i),
        // Every third bar carries its own colour, which is the branch that makes
        // the renderer read per-item styling instead of the series options
        ...(i % 3 === 0 ? { color: '#26a69a' } : {}),
    }));
}

export function barData(count = 50): BarData<Time>[] {
    return Array.from({ length: count }, (_, i) => ohlc(i));
}

export function candlestickData(count = 50): CandlestickData<Time>[] {
    return Array.from({ length: count }, (_, i) => ohlc(i));
}

/**
 * Bars with a hole in them. Whitespace is a separate plot row with no value, and
 * it is what makes a line break rather than bridge the gap.
 */
export function withWhitespace<T extends { time: Time }>(data: T[], every = 7): (T | WhitespaceData<Time>)[] {
    return data.map((item, i) => (i > 0 && i % every === 0 ? { time: item.time } : item));
}

function priceAt(index: number): number {
    return Number((100 + Math.sin(index / 4) * 12 + index * 0.4).toFixed(2));
}

function ohlc(index: number): CandlestickData<Time> & BarData<Time> {
    const open = priceAt(index);
    const close = priceAt(index + 1);
    return {
        time: timeAt(index),
        open,
        high: Number((Math.max(open, close) + 2.5).toFixed(2)),
        low: Number((Math.min(open, close) - 2.5).toFixed(2)),
        close,
    };
}

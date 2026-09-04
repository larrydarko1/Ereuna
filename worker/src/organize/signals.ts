/** Technical trading signals for one symbol. */
import type { Series } from '@/organize/bars.js';
import { macd, numeric, rsi, sma } from '@/utils/indicators.js';

type SignalDirection = 'BUY' | 'SELL';

export type Signal = {
    date: string; // ISO date of the bar that triggered it, not of the run
    type: SignalDirection;
    strategy: string;
    indicator_value: number;
    price: number;
    description: string;
};

/** How much history a signal needs. The moving-average cross is the long pole. */
export const SIGNAL_MIN_BARS = 200;

const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;
const VOLUME_SPIKE_MULTIPLE = 2;
const VOLUME_SPIKE_LOOKBACK = 20;
const BREAKOUT_MOVE_PERCENT = 3;

/**
 * The signals firing on the last bar of `series`.
 * `date` is the bar's own date rather than today's: the run happens hours after
 * the close and can be re-run the next morning after a failure, and a signal
 * stamped with the day it was computed rather than the day it fired is a signal
 * that silently moves.
 */
export function generateSignals(series: Series): Signal[] {
    const { closes, volumes, timestamps } = series;
    if (closes.length < SIGNAL_MIN_BARS) return [];

    const price = closes[closes.length - 1];
    const date = timestamps[timestamps.length - 1];
    if (price === undefined || date === undefined) return [];

    const isoDate = date.toISOString().slice(0, 10);
    const signals: Signal[] = [];
    const emit = (type: SignalDirection, strategy: string, indicatorValue: number, description: string): void => {
        signals.push({ date: isoDate, type, strategy, indicator_value: indicatorValue, price, description });
    };

    const reading = rsi(closes);
    if (reading !== null && reading < RSI_OVERSOLD) {
        emit('BUY', 'RSI_Oversold', round2(reading), `RSI at ${round2(reading)} (oversold < ${RSI_OVERSOLD})`);
    } else if (reading !== null && reading > RSI_OVERBOUGHT) {
        emit('SELL', 'RSI_Overbought', round2(reading), `RSI at ${round2(reading)} (overbought > ${RSI_OVERBOUGHT})`);
    }

    const convergence = macd(closes);
    if (convergence !== null) {
        const crossed = crossing(convergence.macd, convergence.signal);
        if (crossed === 'up')
            emit(
                'BUY',
                'MACD_Bullish_Cross',
                gap(convergence.macd, convergence.signal, 4),
                'MACD crossed above its signal line',
            );
        if (crossed === 'down')
            emit(
                'SELL',
                'MACD_Bearish_Cross',
                gap(convergence.macd, convergence.signal, 4),
                'MACD crossed below its signal line',
            );
    }

    const fast = rollingMean(closes, 50);
    const slow = rollingMean(closes, 200);
    const crossed = crossing(fast, slow);
    if (crossed === 'up')
        emit('BUY', 'Golden_Cross', gap(fast, slow, 2), '50-day moving average crossed above the 200-day');
    if (crossed === 'down')
        emit('SELL', 'Death_Cross', gap(fast, slow, 2), '50-day moving average crossed below the 200-day');

    const move = changePercent(closes);
    if (move !== null && isVolumeSpike(volumes)) {
        if (move > BREAKOUT_MOVE_PERCENT)
            emit('BUY', 'Volume_Breakout', round2(move), `Volume spike with a ${round2(move)}% move up`);
        if (move < -BREAKOUT_MOVE_PERCENT)
            emit('SELL', 'Volume_Breakdown', round2(move), `Volume spike with a ${round2(move)}% move down`);
    }

    return signals;
}

/**
 * Which way `fast` crossed `slow` on the last bar, if it did.
 * Equality on the previous bar counts as a cross when the current bar
 * separates them, so a series that touches and then parts is not missed.
 */
function crossing(fast: readonly (number | null)[], slow: readonly (number | null)[]): 'up' | 'down' | null {
    if (fast.length < 2 || slow.length < 2) return null;

    const previousFast = numeric(fast[fast.length - 2]);
    const previousSlow = numeric(slow[slow.length - 2]);
    const currentFast = numeric(fast[fast.length - 1]);
    const currentSlow = numeric(slow[slow.length - 1]);
    if (previousFast === null || previousSlow === null || currentFast === null || currentSlow === null) return null;

    if (previousFast <= previousSlow && currentFast > currentSlow) return 'up';
    if (previousFast >= previousSlow && currentFast < currentSlow) return 'down';
    return null;
}

/** How far apart the two series end, rounded — the signal's indicator value. */
function gap(fast: readonly (number | null)[], slow: readonly (number | null)[], places: number): number {
    const factor = 10 ** places;
    const last = (numeric(fast[fast.length - 1]) ?? 0) - (numeric(slow[slow.length - 1]) ?? 0);
    return Math.round(last * factor) / factor;
}

/**
 * A moving average at every point in the series, null until there is a full
 * window. A running sum rather than a mean per point: only the last two values
 * are read, but computing them still requires walking the series, and doing
 * that quadratically over the whole universe is minutes of the run.
 */
function rollingMean(values: readonly number[], period: number): (number | null)[] {
    const out: (number | null)[] = [];
    let sum = 0;

    for (let index = 0; index < values.length; index += 1) {
        sum += values[index] ?? 0;
        if (index >= period) sum -= values[index - period] ?? 0;
        out.push(index + 1 < period ? null : sum / period);
    }

    return out;
}

/**
 * Whether the latest bar's volume stands out against the preceding twenty.
 * The average deliberately excludes the current bar — comparing a value with
 * an average that contains it is how a spike hides itself.
 */
function isVolumeSpike(volumes: readonly number[]): boolean {
    if (volumes.length < VOLUME_SPIKE_LOOKBACK + 1) return false;

    const current = volumes[volumes.length - 1];
    const baseline = sma(volumes.slice(0, volumes.length - 1), VOLUME_SPIKE_LOOKBACK);
    return current !== undefined && baseline !== null && baseline > 0 && current > baseline * VOLUME_SPIKE_MULTIPLE;
}

/** The last bar's move, as a percentage. */
function changePercent(closes: readonly number[]): number | null {
    if (closes.length < 2) return null;
    const previous = closes[closes.length - 2];
    const current = closes[closes.length - 1];
    if (previous === undefined || current === undefined || previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

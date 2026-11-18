/** Restating bars for stock splits. */
import type { OhlcvDoc } from '@ereuna/shared';

/** A bar restated as if the split had always been in force: prices divided by the factor, volume multiplied. */
export function toSplitAdjusted(bar: OhlcvDoc, factor: number): OhlcvDoc {
    return {
        tickerID: bar.tickerID,
        timestamp: bar.timestamp,
        open: bar.open / factor,
        high: bar.high / factor,
        low: bar.low / factor,
        close: bar.close / factor,
        volume: bar.volume * factor,
    };
}

/** Whether a vendor split factor is a real split: one, or anything unusable, is none. */
export function isSplit(factor: number): boolean {
    return Number.isFinite(factor) && factor > 0 && factor !== 1;
}

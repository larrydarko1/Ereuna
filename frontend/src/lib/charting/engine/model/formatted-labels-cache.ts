/**
 * Caches formatted axis labels by value.
 *
 * Formatting a price is not free and the same handful of values are formatted on
 * every frame while the chart is idle, so the cache is keyed on the value and
 * capped rather than cleared.
 */
import { getDefined } from '@/lib/charting/engine/helpers/assertions';

import { type IHorzScaleBehavior } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type TickMark } from '@/lib/charting/engine/model/time/tick-marks';

type CachedTick = {
    string: string;
    tick: number;
};

export type FormatFunction = (tickMark: TickMark) => string;

export class FormattedLabelsCache<THorzScaleItem> {
    private readonly _format: FormatFunction;
    private readonly _maxSize: number;
    private _actualSize = 0;
    private _usageTick = 1;
    private _oldestTick = 1;
    private _cache = new Map<number, CachedTick>();
    private _tick2Labels = new Map<number, number>();

    private readonly _horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>;

    public constructor(format: FormatFunction, horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>, size = 50) {
        this._format = format;
        this._horzScaleBehavior = horzScaleBehavior;
        this._maxSize = size;
    }

    public format(tickMark: TickMark): string {
        const time = tickMark.time;

        const cacheKey = this._horzScaleBehavior.cacheKey(time);

        const tick = this._cache.get(cacheKey);
        if (tick !== undefined) {
            return tick.string;
        }

        if (this._actualSize === this._maxSize) {
            const oldestValue = this._tick2Labels.get(this._oldestTick);
            this._tick2Labels.delete(this._oldestTick);
            this._cache.delete(getDefined(oldestValue));
            this._oldestTick++;
            this._actualSize--;
        }

        const str = this._format(tickMark);
        this._cache.set(cacheKey, { string: str, tick: this._usageTick });
        this._tick2Labels.set(this._usageTick, cacheKey);
        this._actualSize++;
        this._usageTick++;
        return str;
    }
}

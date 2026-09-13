/**
 * The visible span of the horizontal scale, as a range of logical positions.
 *
 * It is logical rather than an index range because the edges may be fractional and
 * may sit past the last bar — the right offset is exactly that.
 */
import { RangeImpl } from '@/lib/charting/engine/model/range-impl';
import { type Logical, type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';

export class TimeScaleVisibleRange {
    private readonly _logicalRange: RangeImpl<Logical> | null;

    public constructor(logicalRange: RangeImpl<Logical> | null) {
        this._logicalRange = logicalRange;
    }

    public strictRange(): RangeImpl<TimePointIndex> | null {
        if (this._logicalRange === null) {
            return null;
        }

        return new RangeImpl(
            Math.floor(this._logicalRange.left()) as TimePointIndex,
            Math.ceil(this._logicalRange.right()) as TimePointIndex,
        );
    }

    public logicalRange(): RangeImpl<Logical> | null {
        return this._logicalRange;
    }

    public static invalid(): TimeScaleVisibleRange {
        return new TimeScaleVisibleRange(null);
    }
}

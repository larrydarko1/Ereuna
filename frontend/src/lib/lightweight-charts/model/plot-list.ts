import { lowerBound, upperBound } from '@/lib/lightweight-charts/helpers/algorithms';
import { getDefined, getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { type Nominal } from '@/lib/lightweight-charts/helpers/nominal';

import { type PlotRow, type PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

/**
 * Search direction if no data found at provided index
 */
export const MismatchDirection = {
    /**
     * Search the nearest left item
     */
    NearestLeft: -1,
    /**
     * Do not search
     */
    None: 0,
    /**
     * Search the nearest right item
     */
    NearestRight: 1,
} as const;
export type MismatchDirection = (typeof MismatchDirection)[keyof typeof MismatchDirection];

export type MinMax = {
    min: number;
    max: number;
};

type PlotRowIndex = Nominal<number, 'PlotRowIndex'>;

// Fixed for now; upstream wondered about sizing it to the data
const CHUNK_SIZE = 30;

/**
 * PlotList is an array of plot rows
 * each plot row consists of key (index in timescale) and plot value map
 */
export class PlotList<TPlotRowType extends PlotRow = PlotRow> {
    private _items: readonly TPlotRowType[] = [];
    private _minMaxCache = new Map<PlotRowValueIndex, Map<number, MinMax | null>>();
    private _rowSearchCache = new Map<TimePointIndex, Map<MismatchDirection, TPlotRowType>>();

    // @returns Last row
    public last(): TPlotRowType | null {
        return this._items[this._items.length - 1] ?? null;
    }

    public firstIndex(): TimePointIndex | null {
        return this.size() > 0 ? this._indexAt(0 as PlotRowIndex) : null;
    }

    public lastIndex(): TimePointIndex | null {
        return this.size() > 0 ? this._indexAt((this._items.length - 1) as PlotRowIndex) : null;
    }

    public size(): number {
        return this._items.length;
    }

    public isEmpty(): boolean {
        return this.size() === 0;
    }

    public contains(index: TimePointIndex): boolean {
        return this._search(index, MismatchDirection.None) !== null;
    }

    public valueAt(index: TimePointIndex): TPlotRowType | null {
        return this.search(index);
    }

    public search(index: TimePointIndex, searchMode: MismatchDirection = MismatchDirection.None): TPlotRowType | null {
        const pos = this._search(index, searchMode);
        if (pos === null) {
            return null;
        }

        return {
            ...this._valueAt(pos),
            index: this._indexAt(pos),
        };
    }

    public rows(): readonly TPlotRowType[] {
        return this._items;
    }

    public minMaxOnRangeCached(
        start: TimePointIndex,
        end: TimePointIndex,
        plots: readonly PlotRowValueIndex[],
    ): MinMax | null {
        // this code works for single series only
        // could fail after whitespaces implementation

        if (this.isEmpty()) {
            return null;
        }

        let result: MinMax | null = null;

        for (const plot of plots) {
            const plotMinMax = this._minMaxOnRangeCachedImpl(start, end, plot);
            result = mergeMinMax(result, plotMinMax);
        }

        return result;
    }

    public setData(plotRows: readonly TPlotRowType[]): void {
        this._rowSearchCache.clear();
        this._minMaxCache.clear();

        this._items = plotRows;
    }

    private _indexAt(offset: PlotRowIndex): TimePointIndex {
        return getDefined(this._items[offset]).index;
    }

    private _valueAt(offset: PlotRowIndex): TPlotRowType {
        return getDefined(this._items[offset]);
    }

    private _search(index: TimePointIndex, searchMode: MismatchDirection): PlotRowIndex | null {
        const exactPos = this._bsearch(index);

        if (exactPos === null && searchMode !== MismatchDirection.None) {
            switch (searchMode) {
                case MismatchDirection.NearestLeft:
                    return this._searchNearestLeft(index);
                case MismatchDirection.NearestRight:
                    return this._searchNearestRight(index);
                default:
                    throw new TypeError('Unknown search mode');
            }
        }

        return exactPos;
    }

    private _searchNearestLeft(index: TimePointIndex): PlotRowIndex | null {
        let nearestLeftPos = this._lowerbound(index);
        if (nearestLeftPos > 0) {
            nearestLeftPos = nearestLeftPos - 1;
        }

        return nearestLeftPos !== this._items.length && this._indexAt(nearestLeftPos as PlotRowIndex) < index
            ? (nearestLeftPos as PlotRowIndex)
            : null;
    }

    private _searchNearestRight(index: TimePointIndex): PlotRowIndex | null {
        const nearestRightPos = this._upperbound(index);
        return nearestRightPos !== this._items.length && index < this._indexAt(nearestRightPos as PlotRowIndex)
            ? (nearestRightPos as PlotRowIndex)
            : null;
    }

    private _bsearch(index: TimePointIndex): PlotRowIndex | null {
        const start = this._lowerbound(index);
        const item = this._items[start as PlotRowIndex];
        if (item !== undefined && !(index < item.index)) {
            return start as PlotRowIndex;
        }

        return null;
    }

    private _lowerbound(index: TimePointIndex): number {
        return lowerBound(this._items, index, (a: TPlotRowType, b: TimePointIndex) => a.index < b);
    }

    private _upperbound(index: TimePointIndex): number {
        return upperBound(this._items, index, (a: TPlotRowType, b: TimePointIndex) => a.index > b);
    }

    private _plotMinMax(
        startIndex: PlotRowIndex,
        endIndexExclusive: PlotRowIndex,
        plotIndex: PlotRowValueIndex,
    ): MinMax | null {
        let result: MinMax | null = null;

        for (let i = startIndex; i < endIndexExclusive; i++) {
            const item = this._items[i];
            if (item === undefined) continue;

            const plotValue = item.value[plotIndex];
            if (Number.isNaN(plotValue)) {
                continue;
            }

            if (result === null) {
                result = { min: plotValue, max: plotValue };
            } else {
                result.min = Math.min(result.min, plotValue);
                result.max = Math.max(result.max, plotValue);
            }
        }

        return result;
    }

    private _minMaxOnRangeCachedImpl(
        start: TimePointIndex,
        end: TimePointIndex,
        plotIndex: PlotRowValueIndex,
    ): MinMax | null {
        // this code works for single series only
        // could fail after whitespaces implementation

        if (this.isEmpty()) {
            return null;
        }

        let result: MinMax | null = null;

        // assume that bar indexes only increase
        const firstIndex = getNotNull(this.firstIndex());
        const lastIndex = getNotNull(this.lastIndex());

        const clampedStart = Math.max(start, firstIndex);
        const clampedEnd = Math.min(end, lastIndex);

        const cachedLow = Math.ceil(clampedStart / CHUNK_SIZE) * CHUNK_SIZE;
        const cachedHigh = Math.max(cachedLow, Math.floor(clampedEnd / CHUNK_SIZE) * CHUNK_SIZE);

        {
            const startIndex = this._lowerbound(clampedStart as TimePointIndex);
            const endIndex = this._upperbound(Math.min(clampedEnd, cachedLow, end) as TimePointIndex); // non-inclusive end
            const plotMinMax = this._plotMinMax(startIndex as PlotRowIndex, endIndex as PlotRowIndex, plotIndex);
            result = mergeMinMax(result, plotMinMax);
        }

        let minMaxCache = this._minMaxCache.get(plotIndex);

        if (minMaxCache === undefined) {
            minMaxCache = new Map();
            this._minMaxCache.set(plotIndex, minMaxCache);
        }

        // now go cached
        for (let index = Math.max(cachedLow + 1, clampedStart); index < cachedHigh; index += CHUNK_SIZE) {
            const chunkIndex = Math.floor(index / CHUNK_SIZE);

            let chunkMinMax = minMaxCache.get(chunkIndex);
            if (chunkMinMax === undefined) {
                const chunkStart = this._lowerbound((chunkIndex * CHUNK_SIZE) as TimePointIndex);
                const chunkEnd = this._upperbound(((chunkIndex + 1) * CHUNK_SIZE - 1) as TimePointIndex);
                chunkMinMax = this._plotMinMax(chunkStart as PlotRowIndex, chunkEnd as PlotRowIndex, plotIndex);
                minMaxCache.set(chunkIndex, chunkMinMax);
            }

            result = mergeMinMax(result, chunkMinMax);
        }

        // tail
        {
            const startIndex = this._lowerbound(cachedHigh as TimePointIndex);
            const endIndex = this._upperbound(clampedEnd as TimePointIndex); // non-inclusive end
            const plotMinMax = this._plotMinMax(startIndex as PlotRowIndex, endIndex as PlotRowIndex, plotIndex);
            result = mergeMinMax(result, plotMinMax);
        }

        return result;
    }
}

function mergeMinMax(first: MinMax | null, second: MinMax | null): MinMax | null {
    if (first === null) {
        return second;
    }
    if (second === null) {
        return first;
    }
    // merge MinMax values
    const min = Math.min(first.min, second.min);
    const max = Math.max(first.max, second.max);
    return { min: min, max: max };
}

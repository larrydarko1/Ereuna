import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

/**
 * Plot's index in plot list tuple for series
 */
export const PlotRowValueIndex = {
    Open: 0,
    High: 1,
    Low: 2,
    Close: 3,
} as const;
export type PlotRowValueIndex = (typeof PlotRowValueIndex)[keyof typeof PlotRowValueIndex];

export type PlotRowValue = [
    number, // open
    number, // high
    number, // low
    number, // close
];

export type PlotRow = {
    readonly index: TimePointIndex;
    readonly time: InternalHorzScaleItem;
    readonly originalTime: unknown;
    readonly value: PlotRowValue;
    readonly customValues?: Record<string, unknown> | undefined;
}

/**
 * What a price scale requires of the sources on it: a first value to
 * autoscale against, and a formatter for its labels.
 */
import { type IPriceFormatter } from '@/lib/charting/engine/formatters/iprice-formatter';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type IDataSource } from '@/lib/charting/engine/model/chart/idata-source';
import { type AutoscaleInfoImpl } from '@/lib/charting/engine/model/series/autoscale-info-impl';
import { type InternalHorzScaleItem } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';

export type FirstValue = {
    value: number;
    timePoint: InternalHorzScaleItem;
};

export type IPriceDataSource = {
    firstValue(): FirstValue | null;
    formatter(): IPriceFormatter;
    priceLineColor(lastBarColor: string): string;
    minMove(): number;
    autoscaleInfo(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfoImpl | null;
    model(): IChartModelBase;
} & IDataSource;

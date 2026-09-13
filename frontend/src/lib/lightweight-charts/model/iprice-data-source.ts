/**
 * What a price scale requires of the sources on it: a first value to
 * autoscale against, and a formatter for its labels.
 */
import { type IPriceFormatter } from '@/lib/lightweight-charts/formatters/iprice-formatter';

import { type AutoscaleInfoImpl } from '@/lib/lightweight-charts/model/autoscale-info-impl';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type IDataSource } from '@/lib/lightweight-charts/model/idata-source';
import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

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

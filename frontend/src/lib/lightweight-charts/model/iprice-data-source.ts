import { type IPriceFormatter } from '@/lib/lightweight-charts/formatters/iprice-formatter';

import { type AutoscaleInfoImpl } from '@/lib/lightweight-charts/model/autoscale-info-impl';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type IDataSource } from '@/lib/lightweight-charts/model/idata-source';
import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

export interface FirstValue {
    value: number;
    timePoint: InternalHorzScaleItem;
}

export interface IPriceDataSource extends IDataSource {
    firstValue(): FirstValue | null;
    formatter(): IPriceFormatter;
    priceLineColor(lastBarColor: string): string;
    minMove(): number;
    autoscaleInfo(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfoImpl | null;
    model(): IChartModelBase;
}

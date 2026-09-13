/**
 * A data source that lives on a price scale, and so has to be able to say
 * what its first value is and how to format one.
 */
import { type IPriceFormatter } from '@/lib/charting/engine/formatters/iprice-formatter';

import { type AutoscaleInfoImpl } from '@/lib/charting/engine/model/series/autoscale-info-impl';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { DataSource } from '@/lib/charting/engine/model/chart/data-source';
import { type FirstValue, type IPriceDataSource } from '@/lib/charting/engine/model/price/iprice-data-source';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';

export abstract class PriceDataSource extends DataSource implements IPriceDataSource {
    private readonly _model: IChartModelBase;

    public constructor(model: IChartModelBase) {
        super();
        this._model = model;
    }

    public model(): IChartModelBase {
        return this._model;
    }

    public abstract minMove(): number;

    public abstract autoscaleInfo(
        startTimePoint: TimePointIndex,
        endTimePoint: TimePointIndex,
    ): AutoscaleInfoImpl | null;

    public abstract firstValue(): FirstValue | null;
    public abstract formatter(): IPriceFormatter;
    public abstract priceLineColor(lastBarColor: string): string;
}

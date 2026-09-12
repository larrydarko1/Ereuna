import { type IPriceFormatter } from '@/lib/lightweight-charts/formatters/iprice-formatter';

import { type AutoscaleInfoImpl } from '@/lib/lightweight-charts/model/autoscale-info-impl';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { DataSource } from '@/lib/lightweight-charts/model/data-source';
import { type FirstValue, type IPriceDataSource } from '@/lib/lightweight-charts/model/iprice-data-source';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

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

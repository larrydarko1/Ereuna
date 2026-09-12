import {
    type CandlestickSeriesPartialOptions,
    fillUpDownCandlesticksColors,
} from '@/lib/lightweight-charts/model/series-options';

import { SeriesApi } from '@/lib/lightweight-charts/api/series-api';

export class CandlestickSeriesApi<THorzScaleItem> extends SeriesApi<'Candlestick', THorzScaleItem> {
    public override applyOptions(options: CandlestickSeriesPartialOptions): void {
        fillUpDownCandlesticksColors(options);
        super.applyOptions(options);
    }
}

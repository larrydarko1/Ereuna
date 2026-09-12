import { ensure } from '@/lib/lightweight-charts/helpers/assertions';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { CrosshairMode, type CrosshairOptions } from '@/lib/lightweight-charts/model/crosshair';
import { type IPriceDataSource } from '@/lib/lightweight-charts/model/iprice-data-source';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import { type ISeries, Series } from '@/lib/lightweight-charts/model/series';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

export class Magnet {
    private readonly _options: CrosshairOptions;

    public constructor(options: CrosshairOptions) {
        this._options = options;
    }

    public align(price: number, index: TimePointIndex, pane: Pane): number {
        const res = price;
        if (this._options.mode === CrosshairMode.Normal) {
            return res;
        }

        const defaultPriceScale = pane.defaultPriceScale();
        const firstValue = defaultPriceScale.firstValue();

        if (firstValue === null) {
            return res;
        }

        const y = defaultPriceScale.priceToCoordinate(price, firstValue);

        // get all serieses from the pane
        const serieses: readonly ISeries<SeriesType>[] = pane
            .dataSources()
            .filter(
                ((ds: IPriceDataSource) => ds instanceof Series) as (ds: IPriceDataSource) => ds is Series<SeriesType>,
            );

        const candidates = serieses.reduce((acc: Coordinate[], series: ISeries<SeriesType>) => {
            if (pane.isOverlay(series) || !series.visible()) {
                return acc;
            }
            const ps = series.priceScale();
            const bars = series.bars();
            if (ps.isEmpty() || !bars.contains(index)) {
                return acc;
            }

            const bar = bars.valueAt(index);
            if (bar === null) {
                return acc;
            }

            // convert bar to pixels
            const firstPrice = ensure(series.firstValue());
            return acc.concat([ps.priceToCoordinate(bar.value[PlotRowValueIndex.Close], firstPrice.value)]);
        }, [] as Coordinate[]);

        if (candidates.length === 0) {
            return res;
        }

        candidates.sort((y1: Coordinate, y2: Coordinate) => Math.abs(y1 - y) - Math.abs(y2 - y));

        const nearest = candidates[0];
        if (nearest === undefined) {
            return res;
        }

        return defaultPriceScale.coordinateToPrice(nearest, firstValue);
    }
}

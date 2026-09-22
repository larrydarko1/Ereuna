/**
 * Finds the price the crosshair should snap to in magnet mode: the nearest of
 * the bar's own values under the pointer, not the pointer's own price.
 */
import { getPresent } from '@/lib/charting/engine/helpers/assertions';
import { CrosshairMode, type CrosshairOptions } from '@/lib/charting/engine/model/chart/crosshair';
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { PlotRowValueIndex } from '@/lib/charting/engine/model/data/plot-data';
import { type IPriceDataSource } from '@/lib/charting/engine/model/price/iprice-data-source';
import { type ISeries, Series } from '@/lib/charting/engine/model/series/series';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';

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

        const priceCoordinate = defaultPriceScale.priceToCoordinate(price, firstValue);

        // get all serieses from the pane
        const serieses: readonly ISeries<SeriesType>[] = pane
            .dataSources()
            .filter((source: IPriceDataSource): source is Series<SeriesType> => source instanceof Series);

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
            const firstPrice = getPresent(series.firstValue());
            return acc.concat([ps.priceToCoordinate(bar.value[PlotRowValueIndex.Close], firstPrice.value)]);
        }, [] as Coordinate[]);

        if (candidates.length === 0) {
            return res;
        }

        candidates.sort(
            (y1: Coordinate, y2: Coordinate) => Math.abs(y1 - priceCoordinate) - Math.abs(y2 - priceCoordinate),
        );

        const nearest = candidates[0];
        if (nearest === undefined) {
            return res;
        }

        return defaultPriceScale.coordinateToPrice(nearest, firstValue);
    }
}

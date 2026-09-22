/**
 * One horizontal line at a fixed price on a series, with its own axis label.
 */
import { merge } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type PriceLineOptions } from '@/lib/charting/engine/model/price/price-line-options';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { CustomPriceLinePaneView } from '@/lib/charting/engine/views/pane/custom-price-line-pane-view';
import { type IPaneView } from '@/lib/charting/engine/views/pane/ipane-view';
import { PanePriceAxisView } from '@/lib/charting/engine/views/pane/pane-price-axis-view';
import { CustomPriceLinePriceAxisView } from '@/lib/charting/engine/views/price-axis/custom-price-line-price-axis-view';
import { type IPriceAxisView } from '@/lib/charting/engine/views/price-axis/iprice-axis-view';

export class CustomPriceLine {
    private readonly _series: ISeries<SeriesType>;
    private readonly _priceLineView: CustomPriceLinePaneView;
    private readonly _priceAxisView: CustomPriceLinePriceAxisView;
    private readonly _panePriceAxisView: PanePriceAxisView;
    private readonly _options: PriceLineOptions;

    public constructor(series: ISeries<SeriesType>, options: PriceLineOptions) {
        this._series = series;
        this._options = options;
        this._priceLineView = new CustomPriceLinePaneView(series, this);
        this._priceAxisView = new CustomPriceLinePriceAxisView(series, this);
        this._panePriceAxisView = new PanePriceAxisView(this._priceAxisView, series, series.model());
    }

    public applyOptions(options: Partial<PriceLineOptions>): void {
        merge(this._options, options);
        this.update();
        this._series.model().lightUpdate();
    }

    public options(): PriceLineOptions {
        return this._options;
    }

    public paneView(): IPaneView {
        return this._priceLineView;
    }

    public labelPaneView(): IPaneView {
        return this._panePriceAxisView;
    }

    public priceAxisView(): IPriceAxisView {
        return this._priceAxisView;
    }

    public update(): void {
        this._priceLineView.update();
        this._priceAxisView.update();
    }

    public yCoord(): Coordinate | null {
        const series = this._series;
        const priceScale = series.priceScale();
        const timeScale = series.model().timeScale();

        if (timeScale.isEmpty() || priceScale.isEmpty()) {
            return null;
        }

        const firstValue = series.firstValue();
        if (firstValue === null) {
            return null;
        }

        return priceScale.priceToCoordinate(this._options.price, firstValue.value);
    }
}

/**
 * A series' own label on the price axis — its last value, formatted the way
 * that series formats prices.
 */
import { generateContrastColors } from '@/lib/charting/engine/helpers/color';
import { type ISeries, type LastValueDataResultWithData } from '@/lib/charting/engine/model/series/series';
import { PriceAxisLastValueMode, type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import {
    type PriceAxisViewRendererCommonData,
    type PriceAxisViewRendererData,
} from '@/lib/charting/engine/renderers/iprice-axis-view-renderer';
import { PriceAxisView } from '@/lib/charting/engine/views/price-axis/price-axis-view';

/**
 * Which pieces the last-value label is built from. All three come off the same
 * `seriesLastValueMode` reading, so they travel together.
 */
type LabelParts = {
    showSeriesLastValue: boolean;
    showSymbolLabel?: boolean;
    showPriceAndPercentage: boolean;
};

export class SeriesPriceAxisView extends PriceAxisView {
    private readonly _source: ISeries<SeriesType>;

    public constructor(source: ISeries<SeriesType>) {
        super();
        this._source = source;
    }

    protected _updateRendererData(
        axisRendererData: PriceAxisViewRendererData,
        paneRendererData: PriceAxisViewRendererData,
        commonRendererData: PriceAxisViewRendererCommonData,
    ): void {
        axisRendererData.visible = false;
        paneRendererData.visible = false;

        const source = this._source;
        if (!source.visible()) {
            return;
        }

        const seriesOptions = source.options();

        const showSeriesLastValue = seriesOptions.lastValueVisible;

        const showSymbolLabel = source.title() !== '';
        const showPriceAndPercentage =
            seriesOptions.seriesLastValueMode === PriceAxisLastValueMode.LastPriceAndPercentageValue;

        const lastValueData = source.lastValueData(false);
        if (lastValueData.noData) {
            return;
        }

        if (showSeriesLastValue) {
            axisRendererData.text = this._axisText(lastValueData, { showSeriesLastValue, showPriceAndPercentage });
            axisRendererData.visible = axisRendererData.text.length !== 0;
        }

        if (showSymbolLabel || showPriceAndPercentage) {
            paneRendererData.text = this._paneText(lastValueData, {
                showSeriesLastValue,
                showSymbolLabel,
                showPriceAndPercentage,
            });
            paneRendererData.visible = paneRendererData.text.length > 0;
        }

        const lastValueColor = source.priceLineColor(lastValueData.color);
        const colors = generateContrastColors(lastValueColor);

        commonRendererData.background = colors.background;
        commonRendererData.coordinate = lastValueData.coordinate;
        paneRendererData.borderColor = source
            .model()
            .backgroundColorAtYPercentFromTop(lastValueData.coordinate / source.priceScale().height());
        axisRendererData.borderColor = lastValueColor;
        axisRendererData.color = colors.foreground;
        paneRendererData.color = colors.foreground;
    }

    protected _paneText(lastValue: LastValueDataResultWithData, shows: LabelParts): string {
        let result = '';

        const title = this._source.title();

        if (shows.showSymbolLabel === true && title.length !== 0) {
            result += `${title} `;
        }

        if (shows.showSeriesLastValue && shows.showPriceAndPercentage) {
            result += this._source.priceScale().isPercentage()
                ? lastValue.formattedPriceAbsolute
                : lastValue.formattedPricePercentage;
        }

        return result.trim();
    }

    protected _axisText(lastValueData: LastValueDataResultWithData, shows: LabelParts): string {
        if (!shows.showSeriesLastValue) {
            return '';
        }

        if (!shows.showPriceAndPercentage) {
            return lastValueData.text;
        }

        return this._source.priceScale().isPercentage()
            ? lastValueData.formattedPricePercentage
            : lastValueData.formattedPriceAbsolute;
    }
}

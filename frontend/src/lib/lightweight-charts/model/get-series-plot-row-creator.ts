import { getDefined } from '@/lib/lightweight-charts/helpers/assertions';
import { type Mutable } from '@/lib/lightweight-charts/helpers/mutable';

import { type CustomData } from '@/lib/lightweight-charts/model/icustom-series';
import { type PlotRow, type PlotRowValue } from '@/lib/lightweight-charts/model/plot-data';
import { type SeriesPlotRow } from '@/lib/lightweight-charts/model/series-data';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

import {
    type AreaData,
    type BarData,
    type BaselineData,
    type CandlestickData,
    type HistogramData,
    isWhitespaceData,
    type LineData,
    type SeriesDataItemTypeMap,
    type WhitespaceData,
} from '@/lib/lightweight-charts/model/data-consumer';
import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';

function getColoredLineBasedSeriesPlotRow<THorzScaleItem>(
    time: InternalHorzScaleItem,
    index: TimePointIndex,
    item: LineData | HistogramData,
    originalTime: THorzScaleItem,
): Mutable<SeriesPlotRow<'Line' | 'Histogram'>> {
    const val = item.value;

    const res: Mutable<SeriesPlotRow<'Line' | 'Histogram'>> = {
        index,
        time,
        value: [val, val, val, val],
        originalTime,
    };

    if (item.color !== undefined) {
        res.color = item.color;
    }

    return res;
}

function getAreaSeriesPlotRow<THorzScaleItem>(
    time: InternalHorzScaleItem,
    index: TimePointIndex,
    item: AreaData,
    originalTime: THorzScaleItem,
): Mutable<SeriesPlotRow<'Area'>> {
    const val = item.value;

    const res: Mutable<SeriesPlotRow<'Area'>> = { index, time, value: [val, val, val, val], originalTime };

    if (item.lineColor !== undefined) {
        res.lineColor = item.lineColor;
    }

    if (item.topColor !== undefined) {
        res.topColor = item.topColor;
    }

    if (item.bottomColor !== undefined) {
        res.bottomColor = item.bottomColor;
    }

    return res;
}

function getBaselineSeriesPlotRow<THorzScaleItem>(
    time: InternalHorzScaleItem,
    index: TimePointIndex,
    item: BaselineData,
    originalTime: THorzScaleItem,
): Mutable<SeriesPlotRow<'Baseline'>> {
    const val = item.value;

    const res: Mutable<SeriesPlotRow<'Baseline'>> = { index, time, value: [val, val, val, val], originalTime };

    if (item.topLineColor !== undefined) {
        res.topLineColor = item.topLineColor;
    }

    if (item.bottomLineColor !== undefined) {
        res.bottomLineColor = item.bottomLineColor;
    }

    if (item.topFillColor1 !== undefined) {
        res.topFillColor1 = item.topFillColor1;
    }

    if (item.topFillColor2 !== undefined) {
        res.topFillColor2 = item.topFillColor2;
    }

    if (item.bottomFillColor1 !== undefined) {
        res.bottomFillColor1 = item.bottomFillColor1;
    }

    if (item.bottomFillColor2 !== undefined) {
        res.bottomFillColor2 = item.bottomFillColor2;
    }

    return res;
}

function getBarSeriesPlotRow<THorzScaleItem>(
    time: InternalHorzScaleItem,
    index: TimePointIndex,
    item: BarData,
    originalTime: THorzScaleItem,
): Mutable<SeriesPlotRow<'Bar'>> {
    const res: Mutable<SeriesPlotRow<'Bar'>> = {
        index,
        time,
        value: [item.open, item.high, item.low, item.close],
        originalTime,
    };

    if (item.color !== undefined) {
        res.color = item.color;
    }

    return res;
}

function getCandlestickSeriesPlotRow<THorzScaleItem>(
    time: InternalHorzScaleItem,
    index: TimePointIndex,
    item: CandlestickData,
    originalTime: THorzScaleItem,
): Mutable<SeriesPlotRow<'Candlestick'>> {
    const res: Mutable<SeriesPlotRow<'Candlestick'>> = {
        index,
        time,
        value: [item.open, item.high, item.low, item.close],
        originalTime,
    };
    if (item.color !== undefined) {
        res.color = item.color;
    }

    if (item.borderColor !== undefined) {
        res.borderColor = item.borderColor;
    }

    if (item.wickColor !== undefined) {
        res.wickColor = item.wickColor;
    }

    return res;
}

// The returned data is used for scaling the series, and providing the current value for the price scale
export type CustomDataToPlotRowValueConverter<THorzScaleItem> = (
    item: CustomData<THorzScaleItem> | WhitespaceData,
) => number[];

function getCustomSeriesPlotRow<THorzScaleItem>(
    time: InternalHorzScaleItem,
    index: TimePointIndex,
    item: CustomData<THorzScaleItem> | WhitespaceData,
    originalTime: THorzScaleItem,
    dataToPlotRow?: CustomDataToPlotRowValueConverter<THorzScaleItem>,
): Mutable<SeriesPlotRow<'Custom'>> {
    const values = getDefined(dataToPlotRow)(item);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const last = getDefined(values[values.length - 1]);
    const value: PlotRowValue = [last, max, min, last];
    // `time` is dropped: the row carries the internal time, not the caller's
    const { time: _time, color, ...data } = item as CustomData<THorzScaleItem>;
    return { index, time, value, originalTime, data, color };
}

export type WhitespacePlotRow = Omit<PlotRow, 'value'>;

export function isSeriesPlotRow(row: SeriesPlotRow | WhitespacePlotRow): row is SeriesPlotRow {
    return (row as Partial<SeriesPlotRow>).value !== undefined;
}

/**
 * The two hooks a custom series brings: how to turn its data into plot values,
 * and how to tell one of its whitespace items apart. Both are absent for every
 * built-in series type, so they travel as one optional argument.
 */
export type CustomSeriesHooks<THorzScaleItem> = {
    dataToPlotRow?: CustomDataToPlotRowValueConverter<THorzScaleItem> | undefined;
    customIsWhitespace?: WhitespaceCheck<THorzScaleItem> | undefined;
};

type SeriesItemValueFnMap<THorzScaleItem> = {
    [T in keyof SeriesDataItemTypeMap]: (
        time: InternalHorzScaleItem,
        index: TimePointIndex,
        item: SeriesDataItemTypeMap<THorzScaleItem>[T],
        originalTime: THorzScaleItem,
        custom?: CustomSeriesHooks<THorzScaleItem>,
    ) => Mutable<SeriesPlotRow<T> | WhitespacePlotRow>;
};

function wrapCustomValues<T extends SeriesPlotRow | WhitespacePlotRow, THorzScaleItem>(
    plotRow: Mutable<T>,
    bar: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType],
): Mutable<T> {
    if (bar.customValues !== undefined) {
        plotRow.customValues = bar.customValues;
    }
    return plotRow;
}

export type WhitespaceCheck<THorzScaleItem> = (
    bar: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType],
) => bar is WhitespaceData<THorzScaleItem>;

function isWhitespaceDataWithCustomCheck<THorzScaleItem>(
    bar: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType],
    customIsWhitespace?: WhitespaceCheck<THorzScaleItem>,
): bar is WhitespaceData<THorzScaleItem> {
    if (customIsWhitespace !== undefined) {
        return customIsWhitespace(bar);
    }
    return isWhitespaceData(bar);
}

type GetPlotRowType =
    | typeof getBaselineSeriesPlotRow
    | typeof getBarSeriesPlotRow
    | typeof getCandlestickSeriesPlotRow
    | typeof getCustomSeriesPlotRow;

function wrapWhitespaceData<TSeriesType extends SeriesType, THorzScaleItem>(
    createPlotRowFn: GetPlotRowType,
): SeriesItemValueFnMap<THorzScaleItem>[TSeriesType] {
    return (
        time: InternalHorzScaleItem,
        index: TimePointIndex,
        bar: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType],
        originalTime: THorzScaleItem,
        custom?: CustomSeriesHooks<THorzScaleItem>,
    ): Mutable<SeriesPlotRow<SeriesType> | WhitespacePlotRow> => {
        const { dataToPlotRow, customIsWhitespace } = custom ?? {};

        if (isWhitespaceDataWithCustomCheck(bar, customIsWhitespace)) {
            return wrapCustomValues({ time, index, originalTime }, bar);
        }

        return wrapCustomValues<ReturnType<GetPlotRowType>, THorzScaleItem>(
            createPlotRowFn(time, index, bar, originalTime, dataToPlotRow),
            bar,
        );
    };
}

export function getSeriesPlotRowCreator<TSeriesType extends SeriesType, THorzScaleItem>(
    seriesType: TSeriesType,
): SeriesItemValueFnMap<THorzScaleItem>[TSeriesType] {
    const seriesPlotRowFnMap: SeriesItemValueFnMap<THorzScaleItem> = {
        Candlestick: wrapWhitespaceData(getCandlestickSeriesPlotRow),
        Bar: wrapWhitespaceData(getBarSeriesPlotRow),
        Area: wrapWhitespaceData(getAreaSeriesPlotRow),
        Baseline: wrapWhitespaceData(getBaselineSeriesPlotRow),
        Histogram: wrapWhitespaceData(getColoredLineBasedSeriesPlotRow),
        Line: wrapWhitespaceData(getColoredLineBasedSeriesPlotRow),
        Custom: wrapWhitespaceData(getCustomSeriesPlotRow),
    };
    return seriesPlotRowFnMap[seriesType];
}

/**
 * Turns a plot row back into the data item the caller originally passed.
 *
 * This is the inverse of `get-series-plot-row-creator.ts`, and exists because the
 * API hands data back out — `ISeriesApi.data()` and the crosshair's `seriesData`
 * both have to return the caller's own shape, not the packed internal row.
 */
import {
    type AreaData,
    type BarData,
    type BaselineData,
    type CandlestickData,
    type LineData,
    type OhlcData,
    type SeriesDataItemTypeMap,
    type SingleValueData,
} from '@/lib/lightweight-charts/model/data-consumer';
import { type CustomData } from '@/lib/lightweight-charts/model/icustom-series';
import { type PlotRow, PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import {
    type AreaPlotRow,
    type BarPlotRow,
    type BaselinePlotRow,
    type CandlestickPlotRow,
    type CustomPlotRow,
    type LinePlotRow,
    type SeriesPlotRow,
} from '@/lib/lightweight-charts/model/series-data';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';

type SeriesPlotRowToDataMap<THorzScaleItem> = {
    [T in keyof SeriesDataItemTypeMap]: (plotRow: SeriesPlotRow<T>) => SeriesDataItemTypeMap<THorzScaleItem>[T];
};

export function getSeriesDataCreator<TSeriesType extends SeriesType, THorzScaleItem>(
    seriesType: TSeriesType,
): (plotRow: SeriesPlotRow<TSeriesType>) => SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType] {
    const seriesPlotRowToDataMap: SeriesPlotRowToDataMap<THorzScaleItem> = {
        Area: areaData<THorzScaleItem>,
        Line: lineData<THorzScaleItem>,
        Baseline: baselineData<THorzScaleItem>,
        Histogram: lineData<THorzScaleItem>,
        Bar: barData<THorzScaleItem>,
        Candlestick: candlestickData<THorzScaleItem>,
        Custom: customData<THorzScaleItem>,
    };
    return seriesPlotRowToDataMap[seriesType];
}

function singleValueData<THorzScaleItem>(plotRow: PlotRow): SingleValueData<THorzScaleItem> {
    const data: SingleValueData<THorzScaleItem> = {
        value: plotRow.value[PlotRowValueIndex.Close],
        time: plotRow.originalTime as THorzScaleItem,
    };
    if (plotRow.customValues !== undefined) {
        data.customValues = plotRow.customValues;
    }
    return data;
}

function lineData<THorzScaleItem>(plotRow: LinePlotRow): LineData<THorzScaleItem> {
    const result: LineData<THorzScaleItem> = singleValueData(plotRow);

    if (plotRow.color !== undefined) {
        result.color = plotRow.color;
    }

    return result;
}

function areaData<THorzScaleItem>(plotRow: AreaPlotRow): AreaData<THorzScaleItem> {
    const result: AreaData<THorzScaleItem> = singleValueData(plotRow);

    if (plotRow.lineColor !== undefined) {
        result.lineColor = plotRow.lineColor;
    }

    if (plotRow.topColor !== undefined) {
        result.topColor = plotRow.topColor;
    }

    if (plotRow.bottomColor !== undefined) {
        result.bottomColor = plotRow.bottomColor;
    }

    return result;
}

function baselineData<THorzScaleItem>(plotRow: BaselinePlotRow): BaselineData<THorzScaleItem> {
    const result: BaselineData<THorzScaleItem> = singleValueData(plotRow);

    if (plotRow.topLineColor !== undefined) {
        result.topLineColor = plotRow.topLineColor;
    }

    if (plotRow.bottomLineColor !== undefined) {
        result.bottomLineColor = plotRow.bottomLineColor;
    }

    if (plotRow.topFillColor1 !== undefined) {
        result.topFillColor1 = plotRow.topFillColor1;
    }

    if (plotRow.topFillColor2 !== undefined) {
        result.topFillColor2 = plotRow.topFillColor2;
    }

    if (plotRow.bottomFillColor1 !== undefined) {
        result.bottomFillColor1 = plotRow.bottomFillColor1;
    }

    if (plotRow.bottomFillColor2 !== undefined) {
        result.bottomFillColor2 = plotRow.bottomFillColor2;
    }

    return result;
}

function ohlcData<THorzScaleItem>(plotRow: PlotRow): OhlcData<THorzScaleItem> {
    const data: OhlcData<THorzScaleItem> = {
        open: plotRow.value[PlotRowValueIndex.Open],
        high: plotRow.value[PlotRowValueIndex.High],
        low: plotRow.value[PlotRowValueIndex.Low],
        close: plotRow.value[PlotRowValueIndex.Close],
        time: plotRow.originalTime as THorzScaleItem,
    };
    if (plotRow.customValues !== undefined) {
        data.customValues = plotRow.customValues;
    }
    return data;
}

function barData<THorzScaleItem>(plotRow: BarPlotRow): BarData<THorzScaleItem> {
    const result: BarData<THorzScaleItem> = ohlcData<THorzScaleItem>(plotRow);

    if (plotRow.color !== undefined) {
        result.color = plotRow.color;
    }

    return result;
}

function candlestickData<THorzScaleItem>(plotRow: CandlestickPlotRow): CandlestickData<THorzScaleItem> {
    const result: CandlestickData<THorzScaleItem> = ohlcData(plotRow);
    const { color, borderColor, wickColor } = plotRow;

    if (color !== undefined) {
        result.color = color;
    }

    if (borderColor !== undefined) {
        result.borderColor = borderColor;
    }

    if (wickColor !== undefined) {
        result.wickColor = wickColor;
    }

    return result;
}

function customData<THorzScaleItem>(plotRow: CustomPlotRow): CustomData<THorzScaleItem> {
    const time = plotRow.originalTime as THorzScaleItem;
    return {
        ...plotRow.data,
        time,
    };
}

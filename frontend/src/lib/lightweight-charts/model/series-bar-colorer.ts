import { ensure, ensureNotNull } from '@/lib/lightweight-charts/helpers/assertions';

import { PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import { type Series } from '@/lib/lightweight-charts/model/series';
import { type SeriesPlotRow } from '@/lib/lightweight-charts/model/series-data';
import {
    type AreaStyleOptions,
    type BarStyleOptions,
    type BaselineStyleOptions,
    type CandlestickStyleOptions,
    type CustomStyleOptions,
    type HistogramStyleOptions,
    type LineStyleOptions,
    type SeriesOptionsMap,
    type SeriesType,
} from '@/lib/lightweight-charts/model/series-options';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

export interface PrecomputedBars {
    value: SeriesPlotRow;
    previousValue?: SeriesPlotRow;
}

export interface CommonBarColorerStyle {
    barColor: string;
}

export interface LineStrokeColorerStyle {
    lineColor: string;
}

export interface LineBarColorerStyle extends CommonBarColorerStyle, LineStrokeColorerStyle {}

export interface HistogramBarColorerStyle extends CommonBarColorerStyle {}
export interface AreaFillColorerStyle {
    topColor: string;
    bottomColor: string;
}
export interface AreaBarColorerStyle extends CommonBarColorerStyle, AreaFillColorerStyle, LineStrokeColorerStyle {}

export interface BaselineStrokeColorerStyle {
    topLineColor: string;
    bottomLineColor: string;
}

export interface BaselineFillColorerStyle {
    topFillColor1: string;
    topFillColor2: string;
    bottomFillColor2: string;
    bottomFillColor1: string;
}

export interface BaselineBarColorerStyle
    extends CommonBarColorerStyle, BaselineStrokeColorerStyle, BaselineFillColorerStyle {}

export interface BarColorerStyle extends CommonBarColorerStyle {}

export interface CandlesticksColorerStyle extends CommonBarColorerStyle {
    barBorderColor: string;
    barWickColor: string;
}

export interface CustomBarColorerStyle extends CommonBarColorerStyle {}

export interface BarStylesMap {
    Bar: BarColorerStyle;
    Candlestick: CandlesticksColorerStyle;
    Area: AreaBarColorerStyle;
    Baseline: BaselineBarColorerStyle;
    Line: LineBarColorerStyle;
    Histogram: HistogramBarColorerStyle;
    Custom: CustomBarColorerStyle;
}

type FindBarFn = (barIndex: TimePointIndex, precomputedBars?: PrecomputedBars) => SeriesPlotRow<SeriesType> | null;

type StyleGetterFn<T extends SeriesType> = (
    findBar: FindBarFn,
    barStyle: ReturnType<Series<T>['options']>,
    barIndex: TimePointIndex,
    precomputedBars?: PrecomputedBars,
) => BarStylesMap[T];

type BarStylesFnMap = {
    [T in keyof SeriesOptionsMap]: StyleGetterFn<T>;
};

export interface ISeriesBarColorer<T extends SeriesType> {
    barStyle(barIndex: TimePointIndex, precomputedBars?: PrecomputedBars): BarStylesMap[T];
}

const barStyleFnMap: BarStylesFnMap = {
    Bar: (
        findBar: FindBarFn,
        barStyle: BarStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): BarColorerStyle => {
        const upColor = barStyle.upColor;
        const downColor = barStyle.downColor;

        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Bar'>;
        const isUp =
            ensure(currentBar.value[PlotRowValueIndex.Open]) <= ensure(currentBar.value[PlotRowValueIndex.Close]);

        return {
            barColor: currentBar.color ?? (isUp ? upColor : downColor),
        };
    },

    Candlestick: (
        findBar: FindBarFn,
        candlestickStyle: CandlestickStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): CandlesticksColorerStyle => {
        const upColor = candlestickStyle.upColor;
        const downColor = candlestickStyle.downColor;
        const borderUpColor = candlestickStyle.borderUpColor;
        const borderDownColor = candlestickStyle.borderDownColor;

        const wickUpColor = candlestickStyle.wickUpColor;
        const wickDownColor = candlestickStyle.wickDownColor;

        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Candlestick'>;
        const isUp =
            ensure(currentBar.value[PlotRowValueIndex.Open]) <= ensure(currentBar.value[PlotRowValueIndex.Close]);

        return {
            barColor: currentBar.color ?? (isUp ? upColor : downColor),
            barBorderColor: currentBar.borderColor ?? (isUp ? borderUpColor : borderDownColor),
            barWickColor: currentBar.wickColor ?? (isUp ? wickUpColor : wickDownColor),
        };
    },

    Custom: (
        findBar: FindBarFn,
        customStyle: CustomStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): CustomBarColorerStyle => {
        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Line'>;

        return {
            barColor: currentBar.color ?? customStyle.color,
        };
    },

    Area: (
        findBar: FindBarFn,
        areaStyle: AreaStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): AreaBarColorerStyle => {
        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Area'>;
        return {
            barColor: currentBar.lineColor ?? areaStyle.lineColor,
            lineColor: currentBar.lineColor ?? areaStyle.lineColor,
            topColor: currentBar.topColor ?? areaStyle.topColor,
            bottomColor: currentBar.bottomColor ?? areaStyle.bottomColor,
        };
    },

    Baseline: (
        findBar: FindBarFn,
        baselineStyle: BaselineStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): BaselineBarColorerStyle => {
        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Baseline'>;
        const isAboveBaseline = currentBar.value[PlotRowValueIndex.Close] >= baselineStyle.baseValue.price;

        return {
            barColor: isAboveBaseline ? baselineStyle.topLineColor : baselineStyle.bottomLineColor,
            topLineColor: currentBar.topLineColor ?? baselineStyle.topLineColor,
            bottomLineColor: currentBar.bottomLineColor ?? baselineStyle.bottomLineColor,
            topFillColor1: currentBar.topFillColor1 ?? baselineStyle.topFillColor1,
            topFillColor2: currentBar.topFillColor2 ?? baselineStyle.topFillColor2,
            bottomFillColor1: currentBar.bottomFillColor1 ?? baselineStyle.bottomFillColor1,
            bottomFillColor2: currentBar.bottomFillColor2 ?? baselineStyle.bottomFillColor2,
        };
    },

    Line: (
        findBar: FindBarFn,
        lineStyle: LineStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): LineBarColorerStyle => {
        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Line'>;

        return {
            barColor: currentBar.color ?? lineStyle.color,
            lineColor: currentBar.color ?? lineStyle.color,
        };
    },

    Histogram: (
        findBar: FindBarFn,
        histogramStyle: HistogramStyleOptions,
        barIndex: TimePointIndex,
        precomputedBars?: PrecomputedBars,
    ): HistogramBarColorerStyle => {
        const currentBar = ensureNotNull(findBar(barIndex, precomputedBars)) as SeriesPlotRow<'Histogram'>;
        return {
            barColor: currentBar.color ?? histogramStyle.color,
        };
    },
};

export class SeriesBarColorer<T extends SeriesType> implements ISeriesBarColorer<T> {
    private _series: Series<T>;
    private readonly _styleGetter: BarStylesFnMap[T];

    public constructor(series: Series<T>) {
        this._series = series;
        this._styleGetter = barStyleFnMap[series.seriesType()];
    }

    public barStyle(barIndex: TimePointIndex, precomputedBars?: PrecomputedBars): BarStylesMap[T] {
        // precomputedBars: {value: [Array BarValues], previousValue: [Array BarValues] | undefined}
        // Used to avoid binary search if bars are already known
        return this._styleGetter(this._findBar, this._series.options(), barIndex, precomputedBars);
    }

    private _findBar = (barIndex: TimePointIndex, precomputedBars?: PrecomputedBars): SeriesPlotRow | null => {
        if (precomputedBars !== undefined) {
            return precomputedBars.value;
        }

        return this._series.bars().valueAt(barIndex);
    };
}

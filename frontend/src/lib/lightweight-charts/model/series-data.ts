/**
 * The plot row shape for each series type, and the plot list that holds them.
 */
import { type PlotRow } from '@/lib/lightweight-charts/model/plot-data';
import { PlotList } from '@/lib/lightweight-charts/model/plot-list';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';

export type LinePlotRow = {
    readonly color?: string | undefined;
} & PlotRow;

export type AreaPlotRow = {
    lineColor?: string;
    topColor?: string;
    bottomColor?: string;
} & PlotRow;

export type BaselinePlotRow = {
    topFillColor1?: string;
    topFillColor2?: string;
    topLineColor?: string;
    bottomFillColor1?: string;
    bottomFillColor2?: string;
    bottomLineColor?: string;
} & PlotRow;

type HistogramPlotRow = {
    readonly color?: string | undefined;
} & PlotRow;

export type BarPlotRow = {
    readonly color?: string | undefined;
} & PlotRow;

export type CandlestickPlotRow = {
    readonly color?: string | undefined;
    readonly borderColor?: string;
    readonly wickColor?: string;
} & PlotRow;

export type CustomPlotRow = {
    // Used to store the original data values
    data: Record<string, unknown>;
    readonly color?: string | undefined;
} & PlotRow;

type SeriesPlotRowTypeAtTypeMap = {
    Bar: BarPlotRow;
    Candlestick: CandlestickPlotRow;
    Area: AreaPlotRow;
    Baseline: BaselinePlotRow;
    Line: LinePlotRow;
    Histogram: HistogramPlotRow;
    Custom: CustomPlotRow;
};

export type SeriesPlotRow<T extends SeriesType = SeriesType> = SeriesPlotRowTypeAtTypeMap[T];
export type SeriesPlotList<T extends SeriesType = SeriesType> = PlotList<SeriesPlotRow<T>>;

export function createSeriesPlotList<T extends SeriesType>(): SeriesPlotList<T> {
    return new PlotList<SeriesPlotRow<T>>();
}

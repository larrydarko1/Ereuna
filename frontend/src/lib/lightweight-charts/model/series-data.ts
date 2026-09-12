import { type PlotRow } from '@/lib/lightweight-charts/model/plot-data';
import { PlotList } from '@/lib/lightweight-charts/model/plot-list';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';

export interface LinePlotRow extends PlotRow {
    readonly color?: string | undefined;
}

export interface AreaPlotRow extends PlotRow {
    lineColor?: string;
    topColor?: string;
    bottomColor?: string;
}

export interface BaselinePlotRow extends PlotRow {
    topFillColor1?: string;
    topFillColor2?: string;
    topLineColor?: string;
    bottomFillColor1?: string;
    bottomFillColor2?: string;
    bottomLineColor?: string;
}

export interface HistogramPlotRow extends PlotRow {
    readonly color?: string | undefined;
}

export interface BarPlotRow extends PlotRow {
    readonly color?: string | undefined;
}

export interface CandlestickPlotRow extends PlotRow {
    readonly color?: string | undefined;
    readonly borderColor?: string;
    readonly wickColor?: string;
}

export interface CustomPlotRow extends PlotRow {
    // Used to store the original data values
    data: Record<string, unknown>;
    readonly color?: string | undefined;
}

export interface SeriesPlotRowTypeAtTypeMap {
    Bar: BarPlotRow;
    Candlestick: CandlestickPlotRow;
    Area: AreaPlotRow;
    Baseline: BaselinePlotRow;
    Line: LinePlotRow;
    Histogram: HistogramPlotRow;
    Custom: CustomPlotRow;
}

export type SeriesPlotRow<T extends SeriesType = SeriesType> = SeriesPlotRowTypeAtTypeMap[T];
export type SeriesPlotList<T extends SeriesType = SeriesType> = PlotList<SeriesPlotRow<T>>;

export function createSeriesPlotList<T extends SeriesType>(): SeriesPlotList<T> {
    return new PlotList<SeriesPlotRow<T>>();
}

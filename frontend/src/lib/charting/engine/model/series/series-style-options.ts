/**
 * What each series type looks like: one options type per type of series,
 * covering only the drawing.
 *
 * These are kept apart from `series-options.ts`, which holds the options every
 * series has whatever it draws, plus the maps that pair the two together.
 */
import { type LineStyle, type LineType, type LineWidth } from '@/lib/charting/engine/renderers/draw-line';

/**
 * Represents style options for a candlestick series.
 */
export type CandlestickStyleOptions = {
    /**
     * Color of rising candles.
     *
     * @defaultValue `'#26a69a'`
     */
    upColor: string;

    /**
     * Color of falling candles.
     *
     * @defaultValue `'#ef5350'`
     */
    downColor: string;

    /**
     * Enable high and low prices candle wicks.
     *
     * @defaultValue `true`
     */
    wickVisible: boolean;

    /**
     * Enable candle borders.
     *
     * @defaultValue `true`
     */
    borderVisible: boolean;

    /**
     * Border color.
     *
     * @defaultValue `'#378658'`
     */
    borderColor: string;

    /**
     * Border color of rising candles.
     *
     * @defaultValue `'#26a69a'`
     */
    borderUpColor: string;

    /**
     * Border color of falling candles.
     *
     * @defaultValue `'#ef5350'`
     */
    borderDownColor: string;

    /**
     * Wick color.
     *
     * @defaultValue `'#737375'`
     */
    wickColor: string;

    /**
     * Wick color of rising candles.
     *
     * @defaultValue `'#26a69a'`
     */
    wickUpColor: string;

    /**
     * Wick color of falling candles.
     *
     * @defaultValue `'#ef5350'`
     */
    wickDownColor: string;
};

export type LastPriceAnimationMode = (typeof LastPriceAnimationMode)[keyof typeof LastPriceAnimationMode];

/**
 * Represents style options for a bar series.
 */
export type BarStyleOptions = {
    /**
     * Color of rising bars.
     *
     * @defaultValue `'#26a69a'`
     */
    upColor: string;

    /**
     * Color of falling bars.
     *
     * @defaultValue `'#ef5350'`
     */
    downColor: string;

    /**
     * Show open lines on bars.
     *
     * @defaultValue `true`
     */
    openVisible: boolean;

    /**
     * Show bars as sticks.
     *
     * @defaultValue `true`
     */
    thinBars: boolean;
};

/**
 * Represents style options for a line series.
 */
export type LineStyleOptions = {
    /**
     * Line color.
     *
     * @defaultValue `'#2196f3'`
     */
    color: string;

    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;

    /**
     * Line width in pixels.
     *
     * @defaultValue `3`
     */
    lineWidth: LineWidth;

    /**
     * Line type.
     *
     * @defaultValue {@link LineType.Simple}
     */
    lineType: LineType;

    /**
     * Show series line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;

    /**
     * Show circle markers on each point.
     *
     * @defaultValue `false`
     */
    pointMarkersVisible: boolean;
    /**
     * Circle markers radius in pixels.
     *
     * @defaultValue `undefined`
     */
    pointMarkersRadius?: number;

    /**
     * Show the crosshair marker.
     *
     * @defaultValue `true`
     */
    crosshairMarkerVisible: boolean;
    /**
     * Crosshair marker radius in pixels.
     *
     * @defaultValue `4`
     */
    crosshairMarkerRadius: number;
    /**
     * Crosshair marker border color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBorderColor: string;
    /**
     * The crosshair marker background color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBackgroundColor: string;
    /**
     * Crosshair marker border width in pixels.
     *
     * @defaultValue `2`
     */
    crosshairMarkerBorderWidth: number;

    /**
     * Last price animation mode.
     *
     * @defaultValue {@link LastPriceAnimationMode.Disabled}
     */
    lastPriceAnimation: LastPriceAnimationMode;
};

/**
 * Represents style options for an area series.
 */
export type AreaStyleOptions = {
    /**
     * Color of the top part of the area.
     *
     * @defaultValue `'rgba( 46, 220, 135, 0.4)'`
     */
    topColor: string;

    /**
     * Color of the bottom part of the area.
     *
     * @defaultValue `'rgba( 40, 221, 100, 0)'`
     */
    bottomColor: string;

    /**
     * Invert the filled area. Fills the area above the line if set to true.
     *
     * @defaultValue `false`
     */
    invertFilledArea: boolean;

    /**
     * Line color.
     *
     * @defaultValue `'#33D778'`
     */
    lineColor: string;

    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;

    /**
     * Line width in pixels.
     *
     * @defaultValue `3`
     */
    lineWidth: LineWidth;

    /**
     * Line type.
     *
     * @defaultValue {@link LineType.Simple}
     */
    lineType: LineType;

    /**
     * Show series line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;

    /**
     * Show circle markers on each point.
     *
     * @defaultValue `false`
     */
    pointMarkersVisible: boolean;
    /**
     * Circle markers radius in pixels.
     *
     * @defaultValue `undefined`
     */
    pointMarkersRadius?: number;

    /**
     * Show the crosshair marker.
     *
     * @defaultValue `true`
     */
    crosshairMarkerVisible: boolean;
    /**
     * Crosshair marker radius in pixels.
     *
     * @defaultValue `4`
     */
    crosshairMarkerRadius: number;
    /**
     * Crosshair marker border color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBorderColor: string;
    /**
     * The crosshair marker background color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBackgroundColor: string;
    /**
     * Crosshair marker border width in pixels.
     *
     * @defaultValue `2`
     */
    crosshairMarkerBorderWidth: number;

    /**
     * Last price animation mode.
     *
     * @defaultValue {@link LastPriceAnimationMode.Disabled}
     */
    lastPriceAnimation: LastPriceAnimationMode;
};

/**
 * Represents a type of priced base value of baseline series type.
 */
type BaseValuePrice = {
    /**
     * Distinguished type value.
     */
    type: 'price';

    /**
     * Price value.
     */
    price: number;
};

/**
 * Represents a type of a base value of baseline series type.
 */
type BaseValueType = BaseValuePrice;

/**
 * Represents style options for a baseline series.
 */
export type BaselineStyleOptions = {
    /**
     * TBase value of the series.
     *
     * @defaultValue `{ type: 'price', price: 0 }`
     */
    baseValue: BaseValueType;

    /**
     * The first color of the top area.
     *
     * @defaultValue `'rgba(38, 166, 154, 0.28)'`
     */
    topFillColor1: string;
    /**
     * The second color of the top area.
     *
     * @defaultValue `'rgba(38, 166, 154, 0.05)'`
     */
    topFillColor2: string;
    /**
     * The line color of the top area.
     *
     * @defaultValue `'rgba(38, 166, 154, 1)'`
     */
    topLineColor: string;

    /**
     * The first color of the bottom area.
     *
     * @defaultValue `'rgba(239, 83, 80, 0.05)'`
     */
    bottomFillColor1: string;
    /**
     * The second color of the bottom area.
     *
     * @defaultValue `'rgba(239, 83, 80, 0.28)'`
     */
    bottomFillColor2: string;
    /**
     * The line color of the bottom area.
     *
     * @defaultValue `'rgba(239, 83, 80, 1)'`
     */
    bottomLineColor: string;

    /**
     * Line width.
     *
     * @defaultValue `3`
     */
    lineWidth: LineWidth;
    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;
    /**
     * Line type.
     *
     * @defaultValue {@link LineType.Simple}
     */
    lineType: LineType;

    /**
     * Show series line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;

    /**
     * Show circle markers on each point.
     *
     * @defaultValue `false`
     */
    pointMarkersVisible: boolean;
    /**
     * Circle markers radius in pixels.
     *
     * @defaultValue `undefined`
     */
    pointMarkersRadius?: number;

    /**
     * Show the crosshair marker.
     *
     * @defaultValue `true`
     */
    crosshairMarkerVisible: boolean;
    /**
     * Crosshair marker radius in pixels.
     *
     * @defaultValue `4`
     */
    crosshairMarkerRadius: number;
    /**
     * Crosshair marker border color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBorderColor: string;
    /**
     * The crosshair marker background color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBackgroundColor: string;
    /**
     * Crosshair marker border width in pixels.
     *
     * @defaultValue `2`
     */
    crosshairMarkerBorderWidth: number;

    /**
     * Last price animation mode.
     *
     * @defaultValue {@link LastPriceAnimationMode.Disabled}
     */
    lastPriceAnimation: LastPriceAnimationMode;
};

/**
 * Represents style options for a histogram series.
 */
export type HistogramStyleOptions = {
    /**
     * Column color.
     *
     * @defaultValue `'#26a69a'`
     */
    color: string;

    /**
     * Initial level of histogram columns.
     *
     * @defaultValue `0`
     */
    base: number;
};

/**
 * Represents style options for a custom series.
 */
export type CustomStyleOptions = {
    /**
     * Color used for the price line and price scale label.
     */
    color: string;
};

/**
 * Represents the type of the last price animation for series such as area or line.
 */
export const LastPriceAnimationMode = {
    /**
     * Animation is always disabled
     */
    Disabled: 0,
    /**
     * Animation is always enabled.
     */
    Continuous: 1,
    /**
     * Animation is active after new data.
     */
    OnDataUpdate: 2,
} as const;

/**
 * The crosshair's options and its mode enum. Kept apart from the Crosshair model
 * because the model constructs its four views and every view reads the mode back:
 * with the enum in crosshair.ts, each view and the model imported each other.
 */
import { type LineStyle, type LineWidth } from '@/lib/charting/engine/renderers/draw-line';

export type CrosshairMode = (typeof CrosshairMode)[keyof typeof CrosshairMode];

/** Structure describing a crosshair line (vertical or horizontal) */
type CrosshairLineOptions = {
    /**
     * Crosshair line color.
     *
     * @defaultValue `'#758696'`
     */
    color: string;

    /**
     * Crosshair line width.
     *
     * @defaultValue `1`
     */
    width: LineWidth;

    /**
     * Crosshair line style.
     *
     * @defaultValue {@link LineStyle.LargeDashed}
     */
    style: LineStyle;

    /**
     * Display the crosshair line.
     *
     * Note that disabling crosshair lines does not disable crosshair marker on Line and Area series.
     * It can be disabled by using `crosshairMarkerVisible` option of a relevant series.
     *
     * @see {@link LineStyleOptions.crosshairMarkerVisible}
     * @see {@link AreaStyleOptions.crosshairMarkerVisible}
     * @see {@link BaselineStyleOptions.crosshairMarkerVisible}
     * @defaultValue `true`
     */
    visible: boolean;

    /**
     * Display the crosshair label on the relevant scale.
     *
     * @defaultValue `true`
     */
    labelVisible: boolean;

    /**
     * Crosshair label background color.
     *
     * @defaultValue `'#4c525e'`
     */
    labelBackgroundColor: string;
};

/** Structure describing crosshair options  */
export type CrosshairOptions = {
    /**
     * Crosshair mode
     *
     * @defaultValue {@link CrosshairMode.Magnet}
     */
    mode: CrosshairMode;

    /**
     * Vertical line options.
     */
    vertLine: CrosshairLineOptions;

    /**
     * Horizontal line options.
     */
    horzLine: CrosshairLineOptions;
};

/**
 * Represents the crosshair mode.
 */
export const CrosshairMode = {
    /**
     * This mode allows crosshair to move freely on the chart.
     */
    Normal: 0,
    /**
     * This mode sticks crosshair's horizontal line to the price value of a single-value series or to the close price of OHLC-based series.
     */
    Magnet: 1,
    /**
     * This mode disables rendering of the crosshair.
     */
    Hidden: 2,
} as const;

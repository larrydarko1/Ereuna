/**
 * The vocabulary the chart's own components share.
 * These types are passed between `PriceChart` and the pieces it composes, so
 * they live beside them rather than inside any one of them — an SFC's
 * `<script setup>` cannot export a type for its siblings to import.
 */

/** The drawing tool in use, or null when the pointer pans and zooms the chart. */
export type ChartTool = 'ruler' | 'trendline' | 'box' | 'text' | 'freehand' | 'priceLevel';

export const CHART_TOOLS = ['ruler', 'trendline', 'box', 'text', 'freehand', 'priceLevel'] as const satisfies readonly ChartTool[];

/** One bar, with its move against the bar before it, as the legend reads it. */
export type ChartQuote = {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
};

/** An overlay's name and the colour it is plotted in. */
export type OverlayLabel = {
    label: string;
    color: string;
};

/** How many bars the volume colouring averages over before calling one heavy. */
export const VOLUME_WINDOW = 250;

/** The detector needs a run of bars before a pivot means anything. */
export const MIN_PATTERN_BARS = 20;

/** How close to the left edge the view gets before the next page is asked for. */
export const PREFETCH_BARS = 20;

/** The only timeframes an exchange outside NASDAQ and NYSE has bars for. */
export const EOD_TIMEFRAMES = ['daily', 'weekly'] as const;

/**
 * The label on each timeframe button.
 * Abbreviations, not prose: "5m" and "1D" read the same in every locale the app
 * ships, and eighteen copies of the same six characters is not a translation.
 */
export const TIMEFRAME_LABELS = {
    intraday1m: '1m',
    intraday5m: '5m',
    intraday15m: '15m',
    intraday30m: '30m',
    intraday1hr: '1h',
    daily: '1D',
    weekly: '1W',
} as const;

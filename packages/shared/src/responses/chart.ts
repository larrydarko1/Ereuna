/**
 * Response schemas for /api/charts — the price series and the saved drawings
 * (see responses/identity.ts for how `send()` uses them).
 * Overlays are computed server-side and arrive on the series. The drawing shapes
 * are the ones the chart's tools write; the API validates a save against them
 * too, so a drawing it hands back is one a tool can load.
 */
import { z } from 'zod';

import { CHART_TIMEFRAMES } from '#db/collections.js';

const candleSchema = z.object({
    time: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
});

const seriesPointSchema = z.object({
    time: z.string(),
    value: z.number(),
});

const chartOverlaySchema = z.object({
    type: z.enum(['SMA', 'EMA']),
    period: z.number(),
    points: z.array(seriesPointSchema),
});

/** GET /charts/:symbol */
export const chartSeriesSchema = z.object({
    symbol: z.string(),
    timeframe: z.enum(CHART_TIMEFRAMES),
    candles: z.array(candleSchema),
    volume: z.array(seriesPointSchema),
    overlays: z.array(chartOverlaySchema),
});

/** A chart time: a UTC timestamp in seconds, a `YYYY-MM-DD` string, or a business day. */
const chartTimeSchema = z.union([
    z.number(),
    z.string(),
    z.object({ year: z.number(), month: z.number(), day: z.number() }),
]);

/** A point pinned to the data — time and price — alongside the pixels it last resolved to. */
const anchoredPointSchema = z.object({
    time: chartTimeSchema,
    price: z.number(),
    x: z.number(),
    y: z.number(),
});

const trendLineSchema = z.object({
    id: z.string(),
    point1: anchoredPointSchema,
    point2: anchoredPointSchema,
    color: z.string(),
    lineWidth: z.number(),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']),
    locked: z.boolean(),
    extended: z.boolean(), // Drawn out to the canvas edges rather than stopping at the two points
});

const boxSchema = z.object({
    id: z.string(),
    point1: anchoredPointSchema, // The corner clicked first
    point2: anchoredPointSchema, // The corner clicked second, diagonally opposite
    fillColor: z.string(),
    borderColor: z.string(),
    fillOpacity: z.number(),
    borderWidth: z.number(),
    locked: z.boolean(),
});

const textAnnotationSchema = z.object({
    id: z.string(),
    point: anchoredPointSchema,
    text: z.string(),
    fontSize: z.number(),
    textColor: z.string(),
    backgroundColor: z.string(),
    backgroundOpacity: z.number(),
    locked: z.boolean(),
});

const freehandPathSchema = z.object({
    id: z.string(),
    points: z.array(anchoredPointSchema),
    color: z.string(),
    lineWidth: z.number(),
    locked: z.boolean(),
});

const priceLevelSchema = z.object({
    id: z.string(),
    price: z.number(),
    color: z.string(),
    text: z.string(),
    lineWidth: z.literal([1, 2, 3, 4]),
    lineStyle: z.literal([0, 1, 2, 3, 4]), // The renderer's LineStyle: solid, dotted, dashed, large dashed, sparse dotted
});

/** GET and PUT /charts/:symbol/drawings — one list per tool. */
export const chartDrawingsSchema = z.object({
    trendLines: z.array(trendLineSchema),
    boxes: z.array(boxSchema),
    textAnnotations: z.array(textAnnotationSchema),
    freehandPaths: z.array(freehandPathSchema),
    priceLevels: z.array(priceLevelSchema),
});

export type Candle = z.infer<typeof candleSchema>;
export type SeriesPoint = z.infer<typeof seriesPointSchema>;
export type ChartOverlay = z.infer<typeof chartOverlaySchema>;
export type ChartSeries = z.infer<typeof chartSeriesSchema>;
export type ChartDrawings = z.infer<typeof chartDrawingsSchema>;

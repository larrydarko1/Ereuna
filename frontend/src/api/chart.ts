/**
 * chart — API wrappers for /api/charts.
 * Overlays are computed server-side and arrive on the series: the API already
 * holds the full window a moving average needs, so sending 1,250 bars for the
 * client to average them would be the same data twice.
 * The profile is the reference data behind the summary sidebar. Every numeric
 * field is a real number or null — the raw documents carry missing values as 0,
 * as NaN and as the string "NaN", and the API normalises all three away.
 * Drawings are stored one document per (symbol, timeframe), in the shapes the
 * chart's tools write — the shared schema the API validates a save against and
 * answers a load with, so what comes back is something a tool can load.
 */
import type {
    AnswerOf,
    AssetProfile,
    ChartDrawings,
    ChartEvents,
    ChartSeries,
    ChartTimeframe,
    QueryOf,
} from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

export function searchAssets(q: string, limit?: number): ApiResult<AnswerOf<'GET /api/charts/search'>> {
    return call('GET /api/charts/search', { query: { q, ...(limit !== undefined && { limit }) } });
}

/** `before` is the cursor for paging backwards: the newest bars strictly older than it. */
export function getSeries(symbol: string, query: QueryOf<'GET /api/charts/:symbol'> = {}): ApiResult<ChartSeries> {
    return call('GET /api/charts/:symbol', { params: { symbol }, query });
}

export function getProfile(symbol: string): ApiResult<AssetProfile> {
    return call('GET /api/charts/:symbol/profile', { params: { symbol } });
}

/** Corporate-action markers. Four of each by default; `all` returns the history. */
export function getEvents(symbol: string, all = false): ApiResult<ChartEvents> {
    return call('GET /api/charts/:symbol/events', { params: { symbol }, query: { all } });
}

export function getDrawings(symbol: string, timeframe: ChartTimeframe): ApiResult<ChartDrawings> {
    return call('GET /api/charts/:symbol/drawings', { params: { symbol }, query: { timeframe } });
}

export function saveDrawings(
    symbol: string,
    timeframe: ChartTimeframe,
    drawings: ChartDrawings,
): ApiResult<ChartDrawings> {
    return call('PUT /api/charts/:symbol/drawings', { params: { symbol }, query: { timeframe }, body: drawings });
}

export function clearDrawings(symbol: string, timeframe: ChartTimeframe): ApiResult<void> {
    return call('DELETE /api/charts/:symbol/drawings', { params: { symbol }, query: { timeframe } });
}

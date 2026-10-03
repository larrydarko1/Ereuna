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
    AssetProfile,
    assetSearchSchema,
    ChartDrawings,
    ChartEvents,
    ChartSeries,
    ChartTimeframe,
    ResponseBody,
} from '@ereuna/shared';

import { api, type ApiResult } from '@/api/client';

type SeriesOptions = {
    timeframe?: ChartTimeframe;
    before?: string; // Cursor for paging backwards: the newest bars strictly older than this
};

export function searchAssets(q: string, limit?: number): ApiResult<ResponseBody<typeof assetSearchSchema>> {
    return api.get<ResponseBody<typeof assetSearchSchema>>('/charts/search', { params: { q, limit } });
}

export function getSeries(symbol: string, options: SeriesOptions = {}): ApiResult<ChartSeries> {
    return api.get<ChartSeries>(`/charts/${encodeURIComponent(symbol)}`, { params: options });
}

export function getProfile(symbol: string): ApiResult<AssetProfile> {
    return api.get<AssetProfile>(`/charts/${encodeURIComponent(symbol)}/profile`);
}

/** Corporate-action markers. Four of each by default; `all` returns the history. */
export function getEvents(symbol: string, all = false): ApiResult<ChartEvents> {
    return api.get<ChartEvents>(`/charts/${encodeURIComponent(symbol)}/events`, { params: { all } });
}

export function getDrawings(symbol: string, timeframe: ChartTimeframe): ApiResult<ChartDrawings> {
    return api.get<ChartDrawings>(`/charts/${encodeURIComponent(symbol)}/drawings`, { params: { timeframe } });
}

export function saveDrawings(
    symbol: string,
    timeframe: ChartTimeframe,
    drawings: ChartDrawings,
): ApiResult<ChartDrawings> {
    return api.put<ChartDrawings>(`/charts/${encodeURIComponent(symbol)}/drawings`, drawings, {
        params: { timeframe },
    });
}

export function clearDrawings(symbol: string, timeframe: ChartTimeframe): ApiResult<void> {
    return api.delete<void>(`/charts/${encodeURIComponent(symbol)}/drawings`, { params: { timeframe } });
}

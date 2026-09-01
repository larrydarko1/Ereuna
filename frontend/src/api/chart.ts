/**
 * chart — API wrappers for /api/charts.
 * Overlays are computed server-side and arrive on the series: the API already
 * holds the full window a moving average needs, so sending 1,250 bars for the
 * client to average them would be the same data twice.
 * Drawings are stored opaquely, one document per (symbol, timeframe). Item
 * geometry is the renderer's business, so the API only counts them — which is
 * why the item type here is `unknown` rather than a shape this layer invents.
 */
import type { ChartDrawings, ChartTimeframe, CorporateAction } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type AssetSummary = {
    symbol: string;
    name: string | null;
    isin: string | null;
    exchange: string | null;
    assetType: string | null;
    currency: string | null;
    sector: string | null;
    marketCap: number | null;
};

export type Candle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
};

export type VolumePoint = {
    time: string;
    value: number;
};

export type ChartOverlay = {
    type: 'SMA' | 'EMA';
    period: number;
    points: { time: string; value: number }[];
};

export type ChartSeries = {
    symbol: string;
    timeframe: ChartTimeframe;
    candles: Candle[];
    volume: VolumePoint[];
    overlays: ChartOverlay[];
    intrinsicValue: number | null;
};

export type ChartEvents = {
    earnings: string[]; // Fiscal period end dates, ISO 8601
    dividends: CorporateAction[];
    splits: CorporateAction[];
};

export type SeriesOptions = {
    timeframe?: ChartTimeframe;
    /** Cursor for paging backwards: the newest bars strictly older than this. */
    before?: string;
};

export function searchAssets(q: string, limit?: number): ApiResult<{ items: AssetSummary[] }> {
    return api.get<{ items: AssetSummary[] }>('/charts/search', { params: { q, limit } });
}

export function getSeries(symbol: string, options: SeriesOptions = {}): ApiResult<ChartSeries> {
    return api.get<ChartSeries>(`/charts/${encodeURIComponent(symbol)}`, { params: options });
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

export function clearDrawings(symbol: string, timeframe: ChartTimeframe): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>(`/charts/${encodeURIComponent(symbol)}/drawings`, { params: { timeframe } });
}

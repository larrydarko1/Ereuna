/**
 * chart — API wrappers for /api/charts.
 * Overlays are computed server-side and arrive on the series: the API already
 * holds the full window a moving average needs, so sending 1,250 bars for the
 * client to average them would be the same data twice.
 * The profile is the reference data behind the summary sidebar. Every numeric
 * field is a real number or null — the raw documents carry missing values as 0,
 * as NaN and as the string "NaN", and the API normalises all three away.
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

export type AssetProfile = {
    symbol: string;
    name: string | null;
    assetType: string | null;
    exchange: string | null;
    isin: string | null;
    ipo: string | null;
    sector: string | null;
    industry: string | null;
    currency: string | null;
    location: string | null;
    website: string | null;
    description: string | null;
    delisted: boolean;
    marketCap: number | null;
    sharesOutstanding: number | null;
    intrinsicValue: number | null;
    bookValue: number | null;
    pe: number | null;
    peg: number | null;
    ps: number | null;
    pb: number | null;
    cagr: number | null;
    cagrYears: number | null;
    dividendYield: number | null;
    dividendDate: string | null;
    rsi: number | null;
    gap: number | null;
    rsScore1W: number | null;
    rsScore1M: number | null;
    rsScore4M: number | null;
    allTimeHigh: number | null;
    allTimeLow: number | null;
    week52High: number | null;
    week52Low: number | null;
    offWeek52High: number | null;
    offWeek52Low: number | null;
    avgVolume1W: number | null;
    avgVolume1M: number | null;
    avgVolume6M: number | null;
    avgVolume1Y: number | null;
    relVolume1W: number | null;
    relVolume1M: number | null;
    relVolume6M: number | null;
    relVolume1Y: number | null;
    adv1W: number | null;
    adv1M: number | null;
    adv4M: number | null;
    adv1Y: number | null;
    fundCategory: string | null;
    fundFamily: string | null;
    netExpenseRatio: number | null;
    aiRecommendation: string | null;
    signals: TradeSignal[];
};

export type TradeSignal = {
    date: string;
    direction: 'BUY' | 'SELL';
    strategy: string;
    description: string;
    price: number | null;
    indicatorValue: number | null;
};

export type ChartEvents = {
    earnings: string[]; // Fiscal period end dates, ISO 8601
    dividends: CorporateAction[];
    splits: CorporateAction[];
};

export type SeriesOptions = {
    timeframe?: ChartTimeframe;
    before?: string; // Cursor for paging backwards: the newest bars strictly older than this
};

type VolumePoint = {
    time: string;
    value: number;
};

export function searchAssets(q: string, limit?: number): ApiResult<{ items: AssetSummary[] }> {
    return api.get<{ items: AssetSummary[] }>('/charts/search', { params: { q, limit } });
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

export function clearDrawings(symbol: string, timeframe: ChartTimeframe): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>(`/charts/${encodeURIComponent(symbol)}/drawings`, { params: { timeframe } });
}

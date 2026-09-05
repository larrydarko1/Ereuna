/**
 * market — API wrappers for /api/market.
 * Everything here is read-only ingested data, cached per read. There is no
 * "last update" call: that timestamp is a field on `stats`, because it belongs
 * to the document it describes, and formatting it for display is this layer's
 * job rather than a route's.
 */
import type { CalendarEventType, MarketOverview, StatsDoc } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type NewsRow = {
    title: string;
    url: string;
    source: string | null;
    summary: string | null;
    imageUrl: string | null;
    tickers: string[];
    publishedDate: string; // ISO 8601
};

export type CalendarEvent = {
    symbol: string;
    type: CalendarEventType;
    reportDate: string;
    details: Record<string, unknown>; // Whatever the ingestor attached for this event type
};

export type DayCalendar = {
    date: string;
    earnings: CalendarEvent[];
    dividends: CalendarEvent[];
    splits: CalendarEvent[];
};

export type Financials = {
    symbol: string;
    annual: Record<string, unknown>[];
    quarterly: Record<string, unknown>[];
};

export type NewsQuery = {
    symbols?: string[];
    since?: string; // An ISO date, or the literal `all` for no lower bound
    limit?: number;
};

export type MarketHoliday = {
    date: string; // YYYY-MM-DD
    name: string;
};

export function getMarketStats(): ApiResult<MarketOverview> {
    return api.get<MarketOverview>('/market/stats');
}

export function getHolidays(): ApiResult<StatsDoc & { Holidays?: MarketHoliday[] }> {
    return api.get<StatsDoc & { Holidays?: MarketHoliday[] }>('/market/holidays');
}

export function getNews(query: NewsQuery = {}): ApiResult<{ items: NewsRow[] }> {
    return api.get<{ items: NewsRow[] }>('/market/news', { params: query });
}

/** Earnings, dividends and splits landing on one day. `date` is ISO (YYYY-MM-DD). */
export function getCalendar(date: string): ApiResult<DayCalendar> {
    return api.get<DayCalendar>('/market/calendar', { params: { date } });
}

export function getFinancials(symbol: string): ApiResult<Financials> {
    return api.get<Financials>(`/market/${encodeURIComponent(symbol)}/financials`);
}

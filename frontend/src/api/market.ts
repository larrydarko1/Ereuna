/**
 * market — API wrappers for /api/market.
 * Everything here is read-only ingested data, cached per read. There is no
 * "last update" call: that timestamp is a field on `stats`, because it belongs
 * to the document it describes, and formatting it for display is this layer's
 * job rather than a route's.
 */
import type { MarketOverview, StatsDoc } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type Financials = {
    symbol: string;
    annual: Record<string, unknown>[];
    quarterly: Record<string, unknown>[];
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

export function getFinancials(symbol: string): ApiResult<Financials> {
    return api.get<Financials>(`/market/${encodeURIComponent(symbol)}/financials`);
}

/**
 * market — API wrappers for /api/market.
 * Everything here is read-only ingested data, cached per read. There is no
 * "last update" call: that timestamp is a field on `stats`, because it belongs
 * to the document it describes, and formatting it for display is this layer's
 * job rather than a route's.
 */
import type { Financials, holidayCalendarSchema, MarketOverview, ResponseBody } from '@ereuna/shared';

import { api, type ApiResult } from '@/api/client';

export function getMarketStats(): ApiResult<MarketOverview> {
    return api.get<MarketOverview>('/market/stats');
}

export function getHolidays(): ApiResult<ResponseBody<typeof holidayCalendarSchema>> {
    return api.get<ResponseBody<typeof holidayCalendarSchema>>('/market/holidays');
}

export function getFinancials(symbol: string): ApiResult<Financials> {
    return api.get<Financials>(`/market/${encodeURIComponent(symbol)}/financials`);
}

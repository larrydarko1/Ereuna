/**
 * market — API wrappers for /api/market.
 * Everything here is read-only ingested data, cached per read. There is no
 * "last update" call: that timestamp is a field on `stats`, because it belongs
 * to the document it describes, and formatting it for display is this layer's
 * job rather than a route's.
 */
import type { AnswerOf, Financials, MarketOverview } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

export function getMarketStats(): ApiResult<MarketOverview> {
    return call('GET /api/market/stats');
}

export function getHolidays(): ApiResult<AnswerOf<'GET /api/market/holidays'>> {
    return call('GET /api/market/holidays');
}

export function getFinancials(symbol: string): ApiResult<Financials> {
    return call('GET /api/market/:symbol/financials', { params: { symbol } });
}

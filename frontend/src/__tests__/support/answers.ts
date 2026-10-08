/**
 * Whole API answers for the suites that mock the network, each one a body the
 * route's schema sends — `mockApi().on()` refuses anything else (see
 * `contract.ts`). Typed against the shared response types, so a field added to
 * a schema breaks the build here rather than every suite at run time.
 * `assets.ts`, `overview.ts` and `portfolio.ts` hold the larger ones.
 */
import type {
    ChartDrawings,
    ChartSeries,
    NoteRow,
    PortfolioRow,
    Preferences,
    Quote,
    ScreenerResult,
    ScreenerSummary,
    SessionUser,
    Statement,
    TradeRow,
    WatchlistRow,
    WatchlistSummary,
} from '@ereuna/shared';

import { objectId } from '@/__tests__/support/values';
const EPOCH = '2026-01-01T00:00:00.000Z';

const POINT = { time: '2026-05-04', price: 88, x: 10, y: 20 };

export function sessionUser(over: Partial<SessionUser> = {}): SessionUser {
    return {
        id: '507f1f77bcf86cd799439011',
        username: 'larry',
        language: 'en',
        twoFactorEnabled: false,
        passwordResetRequired: false,
        ...over,
    };
}

export function preferences(over: Partial<Preferences> = {}): Preferences {
    return {
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
        ...over,
    };
}

export function noteRow(over: Partial<NoteRow> = {}): NoteRow {
    return {
        id: objectId(1),
        symbol: 'AAPL',
        message: 'watch the 50-day',
        createdAt: EPOCH,
        updatedAt: EPOCH,
        ...over,
    };
}

/** A notes page holding `items`, its counts filled in from them. */
export function notePage(
    items: NoteRow[] = [],
    over: { total?: number; page?: number; limit?: number } = {},
): {
    items: NoteRow[];
    total: number;
    page: number;
    limit: number;
} {
    return { items, total: items.length, page: 1, limit: 50, ...over };
}

export function tradeRow(over: Partial<TradeRow> = {}): TradeRow {
    return {
        id: objectId(1),
        symbol: 'AAPL',
        action: 'buy',
        shares: 10,
        price: 100,
        total: 1000,
        commission: 0,
        tradeDate: '2026-03-02T00:00:00.000Z',
        createdAt: EPOCH,
        ...over,
    };
}

export function portfolioRow(over: Partial<PortfolioRow> = {}): PortfolioRow {
    return {
        number: 0,
        cash: 10_000,
        baseValue: 10_000,
        leverage: 1,
        defaultCommission: 0,
        benchmarks: [],
        positionCount: 0,
        updatedAt: EPOCH,
        ...over,
    };
}

export function watchlistSummary(name: string, over: Partial<WatchlistSummary> = {}): WatchlistSummary {
    return {
        id: `id-${name}`,
        name,
        position: 0,
        tickerCount: 0,
        tickers: [],
        updatedAt: EPOCH,
        ...over,
    };
}

/** One entry of an open list; `quote` fills in over a quote with no movement, `null` is a symbol with no bar yet. */
export function watchlistRow(ticker: string, quote: Partial<Quote> | null = null): WatchlistRow {
    return {
        ticker,
        exchange: 'NASDAQ',
        quote:
            quote === null
                ? null
                : {
                      symbol: ticker,
                      close: 0,
                      timestamp: EPOCH,
                      previousClose: null,
                      change: null,
                      changePercent: null,
                      ...quote,
                  },
    };
}

export function screenerSummary(name: string, over: Partial<ScreenerSummary> = {}): ScreenerSummary {
    return {
        id: `id-${name}`,
        name,
        include: true,
        filterCount: 0,
        updatedAt: EPOCH,
        ...over,
    };
}

export function screenerResult(symbol: string, over: Partial<ScreenerResult> = {}): ScreenerResult {
    return {
        symbol,
        name: `${symbol} Inc`,
        assetType: 'Stock',
        sector: null,
        exchange: 'NASDAQ',
        columns: {},
        ...over,
    };
}

export function chartSeries(symbol = 'AAPL', over: Partial<ChartSeries> = {}): ChartSeries {
    return { symbol, timeframe: 'daily', candles: [], volume: [], overlays: [], ...over };
}

export function noDrawings(): ChartDrawings {
    return { trendLines: [], boxes: [], textAnnotations: [], freehandPaths: [], priceLevels: [] };
}

export function trendLine(id: string): ChartDrawings['trendLines'][number] {
    return {
        id,
        point1: POINT,
        point2: { ...POINT, time: '2026-06-04', price: 96 },
        color: '#2962ff',
        lineWidth: 1,
        lineStyle: 'solid',
        locked: false,
        extended: false,
    };
}

export function box(id: string): ChartDrawings['boxes'][number] {
    return {
        id,
        point1: POINT,
        point2: { ...POINT, time: '2026-06-04', price: 96 },
        fillColor: '#2962ff',
        borderColor: '#2962ff',
        fillOpacity: 0.2,
        borderWidth: 1,
        locked: false,
    };
}

/** One filed period, ending on `date`, carrying `figures`. */
export function statement(date: string, figures: Statement['figures'] = {}): Statement {
    return { fiscalDateEnding: date, figures };
}

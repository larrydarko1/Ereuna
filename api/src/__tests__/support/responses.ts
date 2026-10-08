/**
 * Whole service results for the route suites, each one a value its response
 * schema accepts. A route answers through `send()`, which refuses a body missing
 * a field — so a mock returning `{ id }` now fails the route the way a service
 * returning it would, and these are what a mock returns instead. Typed against
 * the shared response types, so a field added to a schema breaks the build here
 * rather than every suite at run time.
 */
import type {
    AssetProfile,
    AssetSummary,
    ChartDrawings,
    ChartSeries,
    MarketOverview,
    NoteRow,
    PortfolioExport,
    PortfolioRow,
    PortfolioSummary,
    Preferences,
    ScreenerSummary,
    SessionUser,
    TradeRow,
    WatchlistSummary,
} from '@ereuna/shared';

const EPOCH = new Date(0).toISOString();

export function sessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
    return {
        id: '507f1f77bcf86cd799439011',
        username: 'larry',
        language: 'en',
        twoFactorEnabled: false,
        passwordResetRequired: false,
        ...overrides,
    };
}

export function preferences(overrides: Partial<Preferences> = {}): Preferences {
    return {
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
        ...overrides,
    };
}

export function noteRow(overrides: Partial<NoteRow> = {}): NoteRow {
    return {
        id: '507f191e810c19729de860ea',
        symbol: 'AAPL',
        message: 'watch the 50-day',
        createdAt: EPOCH,
        updatedAt: EPOCH,
        ...overrides,
    };
}

export function tradeRow(overrides: Partial<TradeRow> = {}): TradeRow {
    return {
        id: '507f191e810c19729de860ea',
        symbol: 'AAPL',
        action: 'buy',
        shares: 10,
        price: 100,
        total: 1000,
        commission: 0,
        tradeDate: EPOCH,
        createdAt: EPOCH,
        ...overrides,
    };
}

export function portfolioRow(overrides: Partial<PortfolioRow> = {}): PortfolioRow {
    return {
        number: 0,
        cash: 10_000,
        baseValue: 10_000,
        leverage: 1,
        defaultCommission: 0,
        benchmarks: [],
        positionCount: 0,
        updatedAt: EPOCH,
        ...overrides,
    };
}

export function portfolioSummary(overrides: Partial<PortfolioSummary> = {}): PortfolioSummary {
    return {
        number: 0,
        cash: 10_000,
        baseValue: 10_000,
        leverage: 1,
        defaultCommission: 0,
        positions: [],
        longValue: 0,
        shortValue: 0,
        grossExposure: 0,
        netExposure: 0,
        totalValue: 10_000,
        leverageUsed: null,
        buyingPower: 10_000,
        unrealizedPL: 0,
        totalPL: null,
        totalPLPercent: null,
        stats: null,
        valueHistory: [],
        benchmarks: [],
        ...overrides,
    };
}

export function portfolioExport(): PortfolioExport {
    return {
        portfolio: {
            baseValue: 10_000,
            leverage: 1,
            defaultCommission: 0,
            benchmarks: [],
            stats: null,
            valueHistory: [],
        },
        trades: [{ action: 'deposit', total: 10_000, tradeDate: '2026-01-02' }],
    };
}

export function watchlistSummary(overrides: Partial<WatchlistSummary> = {}): WatchlistSummary {
    return {
        id: '507f191e810c19729de860ea',
        name: 'Tech',
        position: 0,
        tickerCount: 1,
        tickers: ['AAPL'],
        updatedAt: EPOCH,
        ...overrides,
    };
}

export function screenerSummary(overrides: Partial<ScreenerSummary> = {}): ScreenerSummary {
    return {
        id: '507f191e810c19729de860ea',
        name: 'Value',
        include: true,
        filterCount: 1,
        updatedAt: EPOCH,
        ...overrides,
    };
}

export function assetSummary(overrides: Partial<AssetSummary> = {}): AssetSummary {
    return {
        symbol: 'AAPL',
        name: 'Apple Inc',
        isin: null,
        exchange: 'NASDAQ',
        assetType: 'Stock',
        currency: 'USD',
        sector: 'Technology',
        marketCap: null,
        ...overrides,
    };
}

/** A profile the ingestor knows nothing about beyond the symbol: every figure null. */
export function assetProfile(symbol = 'AAPL'): AssetProfile {
    return {
        symbol,
        name: null,
        assetType: null,
        exchange: null,
        isin: null,
        ipo: null,
        sector: null,
        industry: null,
        currency: null,
        location: null,
        website: null,
        description: null,
        delisted: false,
        marketCap: null,
        sharesOutstanding: null,
        bookValue: null,
        pe: null,
        peg: null,
        ps: null,
        pb: null,
        cagr: null,
        cagrYears: null,
        dividendYield: null,
        dividendDate: null,
        rsi: null,
        gap: null,
        rsScore1W: null,
        rsScore1M: null,
        rsScore4M: null,
        allTimeHigh: null,
        allTimeLow: null,
        week52High: null,
        week52Low: null,
        offWeek52High: null,
        offWeek52Low: null,
        avgVolume1W: null,
        avgVolume1M: null,
        avgVolume6M: null,
        avgVolume1Y: null,
        relVolume1W: null,
        relVolume1M: null,
        relVolume6M: null,
        relVolume1Y: null,
        adv1W: null,
        adv1M: null,
        adv4M: null,
        adv1Y: null,
        fundCategory: null,
        fundFamily: null,
        netExpenseRatio: null,
        signals: [],
    };
}

export function chartSeries(overrides: Partial<ChartSeries> = {}): ChartSeries {
    return { symbol: 'AAPL', timeframe: 'daily', candles: [], volume: [], overlays: [], ...overrides };
}

export function emptyDrawings(): ChartDrawings {
    return { trendLines: [], boxes: [], textAnnotations: [], freehandPaths: [], priceLevels: [] };
}

export function marketOverview(): MarketOverview {
    const none = { all: [], stock: [], etf: [], fund: [], otc: [], pink: [], crypto: [] };
    return {
        updatedAt: null,
        indexes: [],
        outlook: [],
        breadth: { advancing: 0, declining: 0, unchanged: 0, newHighs: 0, newLows: 0, neutral: 0 },
        movingAverages: none,
        sectors: [],
        industries: [],
        gainers: [],
        losers: [],
    };
}

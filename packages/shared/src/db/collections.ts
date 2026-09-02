/** MongoDB document types for EreunaDB. */
import type { ObjectId } from 'mongodb';

export type UserDoc = {
    username: string;
    usernameLower: string;
    passwordHash: string;
    totpSecretEncrypted: string | null; // AES-256-GCM ciphertext of the TOTP secret. Never stored in plaintext
    pendingTotpSecretEncrypted: string | null; // A secret that has been generated but not yet confirmed with a valid code
    totpEnabled: boolean;
    recoveryCodeHashes: string[]; // Argon2id hashes of single-use recovery codes. The plaintext is shown once
    language: string;
    theme: string | null;
    defaultSymbol: string;
    hiddenSymbols: string[]; // Symbols the user has hidden from screener results
    chartSettings: ChartSettings | null; // Null until the user first configures the chart
    panels: PanelLayout | null; // The chart view's saved sidebar layout. Null until the user reorders something
    screenerColumns: string[];
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
};

export type ChartSettings = {
    style: ChartStyle; // How a bar is drawn
    indicators: ChartIndicator[];
    intrinsicValue: boolean; // Whether to plot the asset's intrinsic value line
    markers: ChartMarkers; // Which corporate actions are flagged on the time axis
};

/**
 * How the price series is drawn.
 * `heikinAshi` is a candlestick whose bodies are smoothed across neighbours, so
 * it is a rendering of the same bars rather than a different series.
 */
export const CHART_STYLES = ['candlestick', 'bar', 'heikinAshi', 'line', 'area', 'baseline'] as const;

export type ChartStyle = (typeof CHART_STYLES)[number];

export type ChartMarkers = {
    earnings: boolean;
    dividends: boolean;
    splits: boolean;
};

export type ChartIndicator = {
    type: 'SMA' | 'EMA';
    period: number; // Number of bars averaged
    visible: boolean;
};

export type PanelLayout = {
    sections: PanelSection[]; // Left-sidebar sections, in render order
    summaryFields: SummaryField[]; // Rows inside the summary section, in render order
};

export const PANEL_SECTIONS = [
    'summary',
    'eps',
    'earnings',
    'sales',
    'dividends',
    'splits',
    'financials',
    'notes',
    'news',
] as const;

export type PanelSection = (typeof PANEL_SECTIONS)[number];

export const SUMMARY_FIELDS = [
    'symbol',
    'name',
    'assetType',
    'exchange',
    'isin',
    'ipo',
    'sector',
    'industry',
    'currency',
    'rsScore1W',
    'rsScore1M',
    'rsScore4M',
    'marketCap',
    'sharesOutstanding',
    'location',
    'dividendDate',
    'dividendYield',
    'bookValue',
    'peg',
    'pe',
    'ps',
    'allTimeHigh',
    'allTimeLow',
    'week52High',
    'week52Low',
    'offWeek52High',
    'offWeek52Low',
    'rsi',
    'gap',
    'adv1W',
    'adv1M',
    'adv4M',
    'adv1Y',
    'relVolume1W',
    'relVolume1M',
    'relVolume6M',
    'relVolume1Y',
    'avgVolume1W',
    'avgVolume1M',
    'avgVolume6M',
    'avgVolume1Y',
    'fundCategory',
    'fundFamily',
    'netExpenseRatio',
    'intrinsicValue',
    'cagr',
    'cagrYears',
    'website',
    'description',
] as const;

export type SummaryField = (typeof SUMMARY_FIELDS)[number];

export type RefreshTokenDoc = {
    tokenHash: string; // SHA-256 of the raw token. The client holds the only plaintext copy
    userId: ObjectId;
    familyId: string; // One family per login session — reuse detection revokes by family.
    rememberMe: boolean;
    expiresAt: Date; // Absolute session ceiling, set at login. Rotation inherits it, never extends it
    createdAt: Date;
    usedAt?: Date;
};

export type ScreenerDoc = {
    userId: ObjectId;
    name: string;
    nameLower: string; // Lowercased `name` — uniqueness per user is enforced on (userId, nameLower)
    include: boolean; // Whether the screener participates in combined results.
    filters: Record<string, ScreenerFilterValue>;
    createdAt: Date;
    updatedAt: Date;
};

export type ScreenerFilterValue = [number, number] | string[] | string | boolean;

export type WatchlistEntry = {
    ticker: string;
    exchange: string;
};

export type WatchlistDoc = {
    userId: ObjectId;
    name: string;
    nameLower: string;
    list: WatchlistEntry[];
    position: number; // Explicit ordering position, so reordering does not depend on insertion order.
    createdAt: Date;
    updatedAt: Date;
};

export type TradeAction = 'buy' | 'sell' | 'short' | 'cover' | 'deposit' | 'withdrawal';

export type PositionSide = 'long' | 'short';

export type TradeDoc = {
    userId: ObjectId;
    portfolioNumber: number;
    symbol: string | null; // null for deposits and withdrawals, which have no instrument
    action: TradeAction;
    shares: number; // 0 for cash movements
    price: number; // 0 for cash movements
    total: number; // Always positive — the action's sign is carried by `action`, not by this
    commission: number;
    tradeDate: Date;
    createdAt: Date; // Tiebreaker for two trades dated the same day: replay order is (tradeDate, createdAt)
};

export type PositionDoc = {
    userId: ObjectId;
    portfolioNumber: number;
    symbol: string;
    side: PositionSide;
    shares: number; // Always positive — direction is carried by `side`, not by the sign
    avgPrice: number; // Average entry price, excluding commission, which is expensed to cash
    updatedAt: Date;
};

/** One bar of the closed-trade return distribution — 2%-wide buckets. */
export type ReturnBin = {
    min: number;
    max: number;
    range: string;
    count: number;
    positive: boolean;
};

export type TradeReturnsChart = {
    bins: ReturnBin[];
    medianBinIndex: number; // -1 when there are no closed trades
};

export type PortfolioStatsSnapshot = {
    realizedPL: number;
    realizedPLPercent: number;
    winnerCount: number;
    loserCount: number;
    breakevenCount: number;
    winnerPercent: number;
    loserPercent: number;
    breakevenPercent: number;
    avgGain: number;
    avgLoss: number;
    avgGainAbs: number;
    avgLossAbs: number;
    avgPositionSize: number;
    avgHoldTimeWinners: number;
    avgHoldTimeLosers: number;
    gainLossRatio: number | null;
    profitFactor: number | null;
    riskRewardRatio: number | null;
    sortinoRatio: number | null;
    totalCommission: number;
    longCount: number;
    shortCount: number;
    biggestWinner: TradeExtreme | null;
    biggestLoser: TradeExtreme | null;
    tradeReturnsChart: TradeReturnsChart;
};

export type TradeExtreme = {
    ticker: string;
    amount: number;
    tradeCount: number;
};

export type PortfolioValuePoint = {
    date: string;
    value: number;
};

export type PortfolioDoc = {
    userId: ObjectId;
    number: number; // 0–9. A user gets a fixed set of portfolio slots.
    cash: number; // May be negative: that is the margin loan
    baseValue: number;
    leverage: number;
    defaultCommission: number;
    benchmarks: string[];
    stats: PortfolioStatsSnapshot | null;
    valueHistory: PortfolioValuePoint[];
    createdAt: Date;
    updatedAt: Date;
};

export type NoteDoc = {
    userId: ObjectId;
    symbol: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ChartDrawings = {
    trendLines: unknown[];
    boxes: unknown[];
    textAnnotations: unknown[];
    freehandPaths: unknown[];
    priceLevels: unknown[];
};

export const DRAWING_KINDS = [
    'trendLines',
    'boxes',
    'textAnnotations',
    'freehandPaths',
    'priceLevels',
] as const satisfies readonly (keyof ChartDrawings)[];

export type ChartDrawingDoc = {
    userId: ObjectId;
    symbol: string;
    timeframe: ChartTimeframe;
    drawings: ChartDrawings;
    createdAt: Date;
    updatedAt: Date;
};

export const CHART_TIMEFRAMES = [
    'daily',
    'weekly',
    'intraday1m',
    'intraday5m',
    'intraday15m',
    'intraday30m',
    'intraday1hr',
] as const;

export type ChartTimeframe = (typeof CHART_TIMEFRAMES)[number];

export const OHLCV_COLLECTIONS = {
    daily: 'OHCLVData',
    weekly: 'OHCLVData2',
    intraday1m: 'OHCLVData1m',
    intraday5m: 'OHCLVData5m',
    intraday15m: 'OHCLVData15m',
    intraday30m: 'OHCLVData30m',
    intraday1hr: 'OHCLVData1hr',
} as const satisfies Record<ChartTimeframe, string>;

/** Intraday bars carry a time-of-day; daily and weekly bars are dated only. */
export function isIntraday(timeframe: ChartTimeframe): boolean {
    return timeframe !== 'daily' && timeframe !== 'weekly';
}

export type CorporateAction = {
    payment_date?: string;
    date?: string;
    amount?: number;
    ratio?: number;
};

export type AssetInfoDoc = {
    Symbol: string;
    Name?: string;
    ISIN?: string;
    AssetType?: string;
    Sector?: string;
    Industry?: string;
    Exchange?: string;
    Country?: string;
    Currency?: string;
    Delisted?: boolean;
    MarketCapitalization?: number;
    IntrinsicValue?: number;
    dividends?: CorporateAction[];
    splits?: CorporateAction[];
    quarterlyIncome?: { fiscalDateEnding?: string }[];
    quarterlyFinancials?: Record<string, unknown>[];
    AnnualFinancials?: Record<string, unknown>[];
    [field: string]: unknown;
};

export type OhlcvDoc = {
    tickerID: string; // The ingestor's symbol field on the bar collections — not `Symbol`, which is AssetInfo's
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export type NewsDoc = {
    title: string;
    url: string;
    source?: string;
    summary?: string;
    imageUrl?: string;
    tickers: string[];
    publishedDate: Date;
};

export const CALENDAR_EVENT_TYPES = ['Earnings', 'Dividend', 'Split'] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarEventDoc = {
    symbol: string;
    type: CalendarEventType;
    reportDate: Date;
    [field: string]: unknown; // Per-type payload the ingestor attaches (estimate, amount, ratio)
};

export type MarketStatsDoc = {
    _id: string;
    updatedAt?: Date;
    [field: string]: unknown;
};


/**
 * Screener filter registry — the single definition of every screener filter.
 * The API drives one generic update route and one query builder from this
 * table, and the frontend builds its filter panels from the same table, so a
 * new filter is one entry here rather than a route, a handler, a query branch
 * and a component.
 * It lives in the shared package because both sides must agree on the filter
 * keys: the API validates `:filter` against them and the frontend addresses
 * routes by them.
 */

/** Where a range filter's default min/max come from when the client omits one. */
export type FilterBoundsSource =
    | { kind: 'fixed'; min: number; max: number } // Constant bounds — the metric has a defined domain (RSI is 1–100)
    | { kind: 'derived' } // `$min`/`$max` over the queried AssetInfo path
    | { kind: 'latestClose' };

export type RangeFilterSpec = {
    key: string; // URL slug — `PATCH /api/screeners/:name/filters/pe`
    field: string; // The field written on the Screeners document
    queryPath: string; // The AssetInfo path this filter constrains when results are queried.
    label: string; // English label. Log messages only — the frontend translates by `key`
    bounds: FilterBoundsSource;
};

/**
 * Where a categorical filter's selectable options come from: the distinct
 * values of one AssetInfo field. Every categorical filter enumerates its own
 * column, so there is no second source to distinguish.
 */
export type FilterOptionsSource = { path: string };

export type EnumFilterSpec = {
    key: string;
    field: string;
    queryPath: string;
    label: string;
    options: FilterOptionsSource;
};

export type DateFilterSpec = {
    key: string;
    field: string;
    queryPath: string;
    label: string;
};

export type RangeFilterKey = (typeof RANGE_FILTERS)[number]['key'];
export type EnumFilterKey = (typeof ENUM_FILTERS)[number]['key'];
export type DateFilterKey = (typeof DATE_FILTERS)[number]['key'];
export type MaFilterKey = (typeof MA_FILTERS)[number]['key'];
export type FlagFilterKey = (typeof FLAG_FILTERS)[number]['key'];
export type ScreenerFilterKey = RangeFilterKey | EnumFilterKey | DateFilterKey | MaFilterKey | FlagFilterKey;

export type MaTarget = (typeof MA_TARGETS)[number];
export type MaDirection = (typeof MA_DIRECTIONS)[number];

/**
 * Numeric range filters. Each writes `[min, max]` to its `field` and
 * contributes `{ $gt, $lt }` on its `queryPath` when results are queried.
 * `bounds` is only consulted when the client sends one side of the range: the
 * omitted side is filled from the data, so "everything under a PE of 15" does
 * not require the caller to already know the highest PE in the database.
 */
export const RANGE_FILTERS = [
    // Price and size
    { key: 'price', field: 'Price', queryPath: 'TimeSeries.close', label: 'Price', bounds: { kind: 'latestClose' } },
    {
        key: 'market-cap',
        field: 'MarketCap',
        queryPath: 'MarketCapitalization',
        label: 'Market cap',
        bounds: { kind: 'derived' },
    },

    // Valuation
    { key: 'pe', field: 'PE', queryPath: 'PERatio', label: 'P/E ratio', bounds: { kind: 'derived' } },
    { key: 'peg', field: 'PEG', queryPath: 'PEGRatio', label: 'PEG ratio', bounds: { kind: 'derived' } },
    {
        key: 'ps-ratio',
        field: 'PS',
        queryPath: 'PriceToSalesRatioTTM',
        label: 'P/S ratio',
        bounds: { kind: 'derived' },
    },
    { key: 'pb-ratio', field: 'PB', queryPath: 'PriceToBookRatio', label: 'P/B ratio', bounds: { kind: 'derived' } },
    { key: 'enterprise-value', field: 'EV', queryPath: 'EV', label: 'Enterprise value', bounds: { kind: 'derived' } },

    // Earnings, revenue and dividends
    { key: 'eps', field: 'EPS', queryPath: 'EPS', label: 'EPS', bounds: { kind: 'derived' } },
    { key: 'eps-qoq', field: 'EPSQoQ', queryPath: 'EPSQoQ', label: 'EPS growth QoQ', bounds: { kind: 'derived' } },
    { key: 'eps-yoy', field: 'EPSYoY', queryPath: 'EPSYoY', label: 'EPS growth YoY', bounds: { kind: 'derived' } },
    {
        key: 'earnings-qoq',
        field: 'EarningsQoQ',
        queryPath: 'EarningsQoQ',
        label: 'Earnings growth QoQ',
        bounds: { kind: 'derived' },
    },
    {
        key: 'earnings-yoy',
        field: 'EarningsYoY',
        queryPath: 'EarningsYoY',
        label: 'Earnings growth YoY',
        bounds: { kind: 'derived' },
    },
    {
        key: 'revenue-qoq',
        field: 'RevQoQ',
        queryPath: 'RevQoQ',
        label: 'Revenue growth QoQ',
        bounds: { kind: 'derived' },
    },
    {
        key: 'revenue-yoy',
        field: 'RevYoY',
        queryPath: 'RevYoY',
        label: 'Revenue growth YoY',
        bounds: { kind: 'derived' },
    },
    { key: 'cagr', field: 'CAGR', queryPath: 'CAGR', label: 'CAGR', bounds: { kind: 'derived' } },
    {
        key: 'div-yield',
        field: 'DivYield',
        queryPath: 'DividendYield',
        label: 'Dividend yield',
        bounds: { kind: 'derived' },
    },

    // Fund-specific
    {
        key: 'net-expense-ratio',
        field: 'NetExpenseRatio',
        queryPath: 'netExpenseRatio',
        label: 'Net expense ratio',
        bounds: { kind: 'derived' },
    },

    // Balance sheet and margins — the most recent quarterly filing
    {
        key: 'roe',
        field: 'ROE',
        queryPath: 'quarterlyFinancials.0.roe',
        label: 'Return on equity',
        bounds: { kind: 'derived' },
    },
    {
        key: 'roa',
        field: 'ROA',
        queryPath: 'quarterlyFinancials.0.roa',
        label: 'Return on assets',
        bounds: { kind: 'derived' },
    },
    {
        key: 'current-ratio',
        field: 'currentRatio',
        queryPath: 'quarterlyFinancials.0.currentRatio',
        label: 'Current ratio',
        bounds: { kind: 'derived' },
    },
    {
        key: 'current-assets',
        field: 'assetsCurrent',
        queryPath: 'quarterlyFinancials.0.assetsCurrent',
        label: 'Current assets',
        bounds: { kind: 'derived' },
    },
    {
        key: 'current-liabilities',
        field: 'liabilitiesCurrent',
        queryPath: 'quarterlyFinancials.0.liabilitiesCurrent',
        label: 'Current liabilities',
        bounds: { kind: 'derived' },
    },
    {
        key: 'current-debt',
        field: 'debtCurrent',
        queryPath: 'quarterlyFinancials.0.debtCurrent',
        label: 'Current debt',
        bounds: { kind: 'derived' },
    },
    {
        key: 'cash-equivalents',
        field: 'cashAndEq',
        queryPath: 'quarterlyFinancials.0.cashAndEq',
        label: 'Cash and equivalents',
        bounds: { kind: 'derived' },
    },
    {
        key: 'free-cash-flow',
        field: 'freeCashFlow',
        queryPath: 'quarterlyFinancials.0.freeCashFlow',
        label: 'Free cash flow',
        bounds: { kind: 'derived' },
    },
    {
        key: 'profit-margin',
        field: 'profitMargin',
        queryPath: 'quarterlyFinancials.0.profitMargin',
        label: 'Profit margin',
        bounds: { kind: 'derived' },
    },
    {
        key: 'gross-margin',
        field: 'grossMargin',
        queryPath: 'quarterlyFinancials.0.grossMargin',
        label: 'Gross margin',
        bounds: { kind: 'derived' },
    },
    {
        key: 'debt-to-equity',
        field: 'debtEquity',
        queryPath: 'quarterlyFinancials.0.debtEquity',
        label: 'Debt to equity',
        bounds: { kind: 'derived' },
    },
    {
        key: 'book-value',
        field: 'bookVal',
        queryPath: 'quarterlyFinancials.0.bookVal',
        label: 'Book value',
        bounds: { kind: 'derived' },
    },

    // Technicals
    { key: 'rsi', field: 'RSI', queryPath: 'RSI', label: 'RSI', bounds: { kind: 'fixed', min: 1, max: 100 } },
    { key: 'gap-percent', field: 'Gap', queryPath: 'Gap', label: 'Gap %', bounds: { kind: 'derived' } },
    {
        key: 'rs-score-1w',
        field: 'RSScore1W',
        queryPath: 'RSScore1W',
        label: 'RS score 1W',
        bounds: { kind: 'fixed', min: 1, max: 100 },
    },
    {
        key: 'rs-score-1m',
        field: 'RSScore1M',
        queryPath: 'RSScore1M',
        label: 'RS score 1M',
        bounds: { kind: 'fixed', min: 1, max: 100 },
    },
    {
        key: 'rs-score-4m',
        field: 'RSScore4M',
        queryPath: 'RSScore4M',
        label: 'RS score 4M',
        bounds: { kind: 'fixed', min: 1, max: 100 },
    },

    // Volume
    {
        key: 'avg-volume-1w',
        field: 'AvgVolume1W',
        queryPath: 'AvgVolume1W',
        label: 'Average volume 1W',
        bounds: { kind: 'derived' },
    },
    {
        key: 'avg-volume-1m',
        field: 'AvgVolume1M',
        queryPath: 'AvgVolume1M',
        label: 'Average volume 1M',
        bounds: { kind: 'derived' },
    },
    {
        key: 'avg-volume-6m',
        field: 'AvgVolume6M',
        queryPath: 'AvgVolume6M',
        label: 'Average volume 6M',
        bounds: { kind: 'derived' },
    },
    {
        key: 'avg-volume-1y',
        field: 'AvgVolume1Y',
        queryPath: 'AvgVolume1Y',
        label: 'Average volume 1Y',
        bounds: { kind: 'derived' },
    },
    {
        key: 'rel-volume-1w',
        field: 'RelVolume1W',
        queryPath: 'RelVolume1W',
        label: 'Relative volume 1W',
        bounds: { kind: 'derived' },
    },
    {
        key: 'rel-volume-1m',
        field: 'RelVolume1M',
        queryPath: 'RelVolume1M',
        label: 'Relative volume 1M',
        bounds: { kind: 'derived' },
    },
    {
        key: 'rel-volume-6m',
        field: 'RelVolume6M',
        queryPath: 'RelVolume6M',
        label: 'Relative volume 6M',
        bounds: { kind: 'derived' },
    },
    {
        key: 'rel-volume-1y',
        field: 'RelVolume1Y',
        queryPath: 'RelVolume1Y',
        label: 'Relative volume 1Y',
        bounds: { kind: 'derived' },
    },
    {
        key: 'adv-1w',
        field: 'ADV1W',
        queryPath: 'ADV1W',
        label: 'Average dollar volume 1W',
        bounds: { kind: 'derived' },
    },
    {
        key: 'adv-1m',
        field: 'ADV1M',
        queryPath: 'ADV1M',
        label: 'Average dollar volume 1M',
        bounds: { kind: 'derived' },
    },
    {
        key: 'adv-4m',
        field: 'ADV4M',
        queryPath: 'ADV4M',
        label: 'Average dollar volume 4M',
        bounds: { kind: 'derived' },
    },
    {
        key: 'adv-1y',
        field: 'ADV1Y',
        queryPath: 'ADV1Y',
        label: 'Average dollar volume 1Y',
        bounds: { kind: 'derived' },
    },

    // Price performance
    {
        key: 'change-today',
        field: 'todaychange',
        queryPath: 'todaychange',
        label: 'Change today',
        bounds: { kind: 'derived' },
    },
    { key: 'change-1w', field: 'weekchange', queryPath: 'weekchange', label: 'Change 1W', bounds: { kind: 'derived' } },
    { key: 'change-1m', field: 'change1m', queryPath: '1mchange', label: 'Change 1M', bounds: { kind: 'derived' } },
    { key: 'change-4m', field: 'change4m', queryPath: '4mchange', label: 'Change 4M', bounds: { kind: 'derived' } },
    { key: 'change-6m', field: 'change6m', queryPath: '6mchange', label: 'Change 6M', bounds: { kind: 'derived' } },
    { key: 'change-1y', field: 'change1y', queryPath: '1ychange', label: 'Change 1Y', bounds: { kind: 'derived' } },
    { key: 'change-ytd', field: 'ytdchange', queryPath: 'ytdchange', label: 'Change YTD', bounds: { kind: 'derived' } },
    {
        key: 'off-52w-high',
        field: 'PercOffWeekHigh',
        queryPath: 'percoff52WeekHigh',
        label: '% off 52-week high',
        bounds: { kind: 'derived' },
    },
    {
        key: 'off-52w-low',
        field: 'PercOffWeekLow',
        queryPath: 'percoff52WeekLow',
        label: '% off 52-week low',
        bounds: { kind: 'derived' },
    },
] as const satisfies readonly RangeFilterSpec[];

/**
 * Categorical filters. Each writes a `string[]` of selected values to its
 * `field` and contributes `$in` on its `queryPath`.
 * A submitted value must appear in the filter's option set, so an unknown
 * sector cannot be written into a screener and then silently match nothing.
 */
export const ENUM_FILTERS = [
    {
        key: 'asset-types',
        field: 'AssetTypes',
        queryPath: 'AssetType',
        label: 'Asset type',
        options: { path: 'AssetType' },
    },
    { key: 'sectors', field: 'Sectors', queryPath: 'Sector', label: 'Sector', options: { path: 'Sector' } },
    { key: 'exchanges', field: 'Exchanges', queryPath: 'Exchange', label: 'Exchange', options: { path: 'Exchange' } },
    { key: 'countries', field: 'Countries', queryPath: 'Country', label: 'Country', options: { path: 'Country' } },
    {
        key: 'fund-families',
        field: 'FundFamilies',
        queryPath: 'fundFamily',
        label: 'Fund family',
        options: { path: 'fundFamily' },
    },
    {
        key: 'fund-categories',
        field: 'FundCategories',
        queryPath: 'FundCategory',
        label: 'Fund category',
        options: { path: 'FundCategory' },
    },
] as const satisfies readonly EnumFilterSpec[];

/**
 * Date range filters. Stored as a pair of ISO-8601 strings and queried as
 * BSON dates, so they cannot share the numeric range list — a Date compared
 * against a number in MongoDB matches nothing rather than erroring.
 */
export const DATE_FILTERS = [
    { key: 'ipo-date', field: 'IPO', queryPath: 'IPO', label: 'IPO date' },
] as const satisfies readonly DateFilterSpec[];

/**
 * Moving-average relation filters. Each compares one MA against another MA or
 * against the latest close, so they cannot be expressed as a value range —
 * they become `$expr` clauses instead.
 */
export const MA_FILTERS = [
    { key: 'ma-10', field: 'MA10', path: 'MA10', label: 'MA 10' },
    { key: 'ma-20', field: 'MA20', path: 'MA20', label: 'MA 20' },
    { key: 'ma-50', field: 'MA50', path: 'MA50', label: 'MA 50' },
    { key: 'ma-200', field: 'MA200', path: 'MA200', label: 'MA 200' },
] as const;

/** The comparison targets an MA relation filter accepts. */
export const MA_TARGETS = ['10', '20', '50', '200', 'price'] as const;
export const MA_DIRECTIONS = ['abv', 'blw'] as const;

/** Boolean flags stored as `'yes'`, matched with an `$expr` against the 52-week extreme. */
export const FLAG_FILTERS = [
    { key: 'new-high', field: 'NewHigh', label: 'At a new 52-week high' },
    { key: 'new-low', field: 'NewLow', label: 'At a new 52-week low' },
] as const;

const RANGE_BY_KEY = new Map<string, RangeFilterSpec>(RANGE_FILTERS.map((f) => [f.key, f]));
const ENUM_BY_KEY = new Map<string, EnumFilterSpec>(ENUM_FILTERS.map((f) => [f.key, f]));
const DATE_BY_KEY = new Map<string, DateFilterSpec>(DATE_FILTERS.map((f) => [f.key, f]));
const MA_BY_KEY = new Map<string, (typeof MA_FILTERS)[number]>(MA_FILTERS.map((f) => [f.key, f]));
const FLAG_BY_KEY = new Map<string, (typeof FLAG_FILTERS)[number]>(FLAG_FILTERS.map((f) => [f.key, f]));

/** Every filter key the API accepts, for error messages and frontend enumeration. */
export const ALL_FILTER_KEYS: readonly string[] = [
    ...RANGE_FILTERS.map((f) => f.key),
    ...ENUM_FILTERS.map((f) => f.key),
    ...DATE_FILTERS.map((f) => f.key),
    ...MA_FILTERS.map((f) => f.key),
    ...FLAG_FILTERS.map((f) => f.key),
];

/**
 * Every field a filter may write.
 * `resetScreenerFilters` uses this as its allowlist, so a reset can only unset
 * filter fields and never `name`, `userId` or `createdAt`.
 */
export const ALL_FILTER_FIELDS: readonly string[] = [
    ...RANGE_FILTERS.map((f) => f.field),
    ...ENUM_FILTERS.map((f) => f.field),
    ...DATE_FILTERS.map((f) => f.field),
    ...MA_FILTERS.map((f) => f.field),
    ...FLAG_FILTERS.map((f) => f.field),
];

/**
 * Filter key → the field it is stored under.
 * Routes address a filter by `key`, but a screener document records it under
 * `field`, so a client that writes `pe` reads back `PE`. The two names diverge
 * deliberately — the field names are the database's, the keys are the API's —
 * which means reading a stored screener needs this map rather than a guess.
 */
const FIELD_BY_KEY = new Map<string, string>([
    ...RANGE_FILTERS.map((f) => [f.key, f.field] as const),
    ...ENUM_FILTERS.map((f) => [f.key, f.field] as const),
    ...DATE_FILTERS.map((f) => [f.key, f.field] as const),
    ...MA_FILTERS.map((f) => [f.key, f.field] as const),
    ...FLAG_FILTERS.map((f) => [f.key, f.field] as const),
]);

export function findRangeFilter(key: string): RangeFilterSpec | null {
    return RANGE_BY_KEY.get(key) ?? null;
}

export function findEnumFilter(key: string): EnumFilterSpec | null {
    return ENUM_BY_KEY.get(key) ?? null;
}

export function findDateFilter(key: string): DateFilterSpec | null {
    return DATE_BY_KEY.get(key) ?? null;
}

export function findMaFilter(key: string): (typeof MA_FILTERS)[number] | null {
    return MA_BY_KEY.get(key) ?? null;
}

export function findFlagFilter(key: string): (typeof FLAG_FILTERS)[number] | null {
    return FLAG_BY_KEY.get(key) ?? null;
}

export function filterField(key: string): string | undefined {
    return FIELD_BY_KEY.get(key);
}

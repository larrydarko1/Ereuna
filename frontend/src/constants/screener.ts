/**
 * How the screener's filters are arranged on screen, and which columns a
 * result table can show.
 * The API serves the filter catalogue — every key, its kind, its bounds or its
 * options — so nothing about *what* a filter does is repeated here. What the
 * API deliberately does not carry is presentation: which heading a filter sits
 * under, and in what order the headings read. That is this file's whole job.
 * A filter added to the shared registry without a group here lands in the
 * catch-all group rather than disappearing, and the audit test names it.
 */
import { ENUM_FILTERS, MA_FILTERS, RANGE_FILTERS } from '@ereuna/shared';

export type FilterGroup = (typeof FILTER_GROUPS)[number];

/** How a result column reads once it is in a cell. */
export type ColumnFormat = 'text' | 'number' | 'compact' | 'percent' | 'date';

/** Which list the results table is showing: one screener, all of them, or the hidden set. */
export type ListMode = (typeof LIST_MODES)[number];

export type ColumnSpec = {
    path: string; // The AssetInfo path the API projects and keys the row by
    filterKey: string; // The filter this column came from — and so its label
    format: ColumnFormat;
};

/** Headings, in the order they are rendered. */
export const LIST_MODES = ['screener', 'combined', 'hidden'] as const;

export const FILTER_GROUPS = [
    'classification',
    'priceSize',
    'valuation',
    'growth',
    'balanceSheet',
    'margins',
    'technicals',
    'volume',
    'performance',
    'funds',
] as const;

/**
 * Filter key → heading. Kept as one literal table rather than derived from the
 * key's spelling: `cash-equivalents` and `current-ratio` are both balance-sheet
 * lines and share no prefix, and `net-expense-ratio` reads like a margin but
 * only applies to funds.
 */
const GROUP_BY_KEY: Readonly<Record<string, FilterGroup>> = {
    // Classification
    'asset-types': 'classification',
    'sectors': 'classification',
    'exchanges': 'classification',
    'countries': 'classification',
    'ipo-date': 'classification',

    // Price and size
    'price': 'priceSize',
    'market-cap': 'priceSize',

    // Valuation
    'pe': 'valuation',
    'peg': 'valuation',
    'ps-ratio': 'valuation',
    'pb-ratio': 'valuation',
    'enterprise-value': 'valuation',
    'div-yield': 'valuation',

    // Earnings and growth
    'eps': 'growth',
    'eps-qoq': 'growth',
    'eps-yoy': 'growth',
    'earnings-qoq': 'growth',
    'earnings-yoy': 'growth',
    'revenue-qoq': 'growth',
    'revenue-yoy': 'growth',
    'cagr': 'growth',

    // Balance sheet
    'roe': 'balanceSheet',
    'roa': 'balanceSheet',
    'current-ratio': 'balanceSheet',
    'current-assets': 'balanceSheet',
    'current-liabilities': 'balanceSheet',
    'current-debt': 'balanceSheet',
    'cash-equivalents': 'balanceSheet',
    'free-cash-flow': 'balanceSheet',
    'debt-to-equity': 'balanceSheet',
    'book-value': 'balanceSheet',

    // Margins
    'profit-margin': 'margins',
    'gross-margin': 'margins',

    // Technicals
    'rsi': 'technicals',
    'gap-percent': 'technicals',
    'rs-score-1w': 'technicals',
    'rs-score-1m': 'technicals',
    'rs-score-4m': 'technicals',
    'ma-10': 'technicals',
    'ma-20': 'technicals',
    'ma-50': 'technicals',
    'ma-200': 'technicals',

    // Volume
    'avg-volume-1w': 'volume',
    'avg-volume-1m': 'volume',
    'avg-volume-6m': 'volume',
    'avg-volume-1y': 'volume',
    'rel-volume-1w': 'volume',
    'rel-volume-1m': 'volume',
    'rel-volume-6m': 'volume',
    'rel-volume-1y': 'volume',
    'adv-1w': 'volume',
    'adv-1m': 'volume',
    'adv-4m': 'volume',
    'adv-1y': 'volume',

    // Price performance
    'change-today': 'performance',
    'change-1w': 'performance',
    'change-1m': 'performance',
    'change-4m': 'performance',
    'change-6m': 'performance',
    'change-1y': 'performance',
    'change-ytd': 'performance',
    'off-52w-high': 'performance',
    'off-52w-low': 'performance',
    'new-high': 'performance',
    'new-low': 'performance',

    // Funds and ETFs
    'net-expense-ratio': 'funds',
    'fund-families': 'funds',
    'fund-categories': 'funds',
};

/**
 * Percentages come out of the ingestor already scaled (12.5 meaning 12.5%),
 * so they format as `percent` rather than `ratio`. Anything measured in money
 * or shares is compacted; everything else is a plain two-decimal number.
 */
const COMPACT_PATHS = new Set([
    'MarketCapitalization',
    'EV',
    'AvgVolume1W',
    'AvgVolume1M',
    'AvgVolume6M',
    'AvgVolume1Y',
    'ADV1W',
    'ADV1M',
    'ADV4M',
    'ADV1Y',
    'quarterlyFinancials.0.assetsCurrent',
    'quarterlyFinancials.0.liabilitiesCurrent',
    'quarterlyFinancials.0.debtCurrent',
    'quarterlyFinancials.0.cashAndEq',
    'quarterlyFinancials.0.freeCashFlow',
    'quarterlyFinancials.0.bookVal',
]);

const PERCENT_KEYS = new Set([
    'div-yield',
    'net-expense-ratio',
    'gap-percent',
    'eps-qoq',
    'eps-yoy',
    'earnings-qoq',
    'earnings-yoy',
    'revenue-qoq',
    'revenue-yoy',
    'cagr',
    'profit-margin',
    'gross-margin',
    'change-today',
    'change-1w',
    'change-1m',
    'change-4m',
    'change-6m',
    'change-1y',
    'change-ytd',
    'off-52w-high',
    'off-52w-low',
]);

/**
 * Every column a user may add to the results table.
 * The list is the filter registry read a second way: the API projects a column
 * only if some filter names that path, so offering anything else would render
 * a column that is always empty.
 */
export const COLUMNS: readonly ColumnSpec[] = [
    ...RANGE_FILTERS.map((spec) => ({
        path: spec.queryPath,
        filterKey: spec.key,
        format: columnFormat(spec.key, spec.queryPath),
    })),
    ...ENUM_FILTERS.map((spec) => ({ path: spec.queryPath, filterKey: spec.key, format: 'text' as const })),
    ...MA_FILTERS.map((spec) => ({ path: spec.path, filterKey: spec.key, format: 'number' as const })),
];

/** Shown when a user has never chosen columns of their own. */
export const DEFAULT_COLUMNS: readonly string[] = [
    'TimeSeries.close',
    'MarketCapitalization',
    'PERatio',
    'todaychange',
    'AvgVolume1M',
];

const COLUMN_BY_PATH = new Map(COLUMNS.map((column) => [column.path, column]));

/**
 * Which heading a filter belongs under.
 * An unmapped filter is grouped rather than dropped: a filter the API has
 * started serving is still usable while this table catches up.
 */
export function filterGroup(key: string): FilterGroup {
    return GROUP_BY_KEY[key] ?? 'classification';
}

/**
 * Read a column out of a result row.
 * Column paths are the AssetInfo paths the API projects, so they are dotted
 * and may step through an array index — `quarterlyFinancials.0.roe` comes back
 * nested, not as a flat key.
 */
export function readColumn(row: Record<string, unknown>, path: string): unknown {
    let cursor: unknown = row;
    for (const segment of path.split('.')) {
        if (cursor === null || typeof cursor !== 'object') return null;
        cursor = (cursor as Record<string, unknown>)[segment];
    }
    return cursor ?? null;
}

export function findColumn(path: string): ColumnSpec | null {
    return COLUMN_BY_PATH.get(path) ?? null;
}

function columnFormat(key: string, path: string): ColumnFormat {
    if (PERCENT_KEYS.has(key)) return 'percent';
    if (COMPACT_PATHS.has(path)) return 'compact';
    return 'number';
}

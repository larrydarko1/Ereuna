/**
 * What each row of the chart sidebar's summary is called and how it reads.
 * This table replaces 49 single-purpose components, one per row, that between
 * them repeated the same "null, NaN or 0 → show a dash" expression 49 times and
 * still disagreed: two of them hard-coded their English label instead of
 * translating it, and several ran `parseInt` over a ratio, shipping 24 for a
 * P/E of 24.9.
 * The record is keyed by `SummaryField`, so a key added to the shared list
 * without a label and a format here is a compile error rather than a blank row.
 * Display order is the shared list's order; a user's saved layout overrides it.
 */
import type { SummaryField } from '@ereuna/shared';

export type SummaryFormat =
    | 'text' // A plain string
    | 'copyable' // A string worth a copy button — an identifier
    | 'link' // An external URL
    | 'prose' // A paragraph, collapsed until asked for
    | 'date'
    | 'number' // Two decimals
    | 'integer' // A score or a count, where decimals are noise
    | 'compact' // 1_500_000_000 → 1.5B
    | 'percent' // Already a percentage: 3.2 → 3.20%
    | 'ratio'; // A ratio that reads as a percentage: 0.032 → 3.20%

export type SummaryFieldSpec = {
    /** Key under `summary.` in the locale files. */
    labelKey: string;
    format: SummaryFormat;
};

export const SUMMARY_FIELD_SPECS: Record<SummaryField, SummaryFieldSpec> = {
    symbol: { labelKey: 'ticker', format: 'copyable' },
    name: { labelKey: 'companyName', format: 'text' },
    assetType: { labelKey: 'assetType', format: 'text' },
    exchange: { labelKey: 'exchange', format: 'text' },
    isin: { labelKey: 'isin', format: 'copyable' },
    ipo: { labelKey: 'ipoDate', format: 'date' },
    sector: { labelKey: 'sector', format: 'text' },
    industry: { labelKey: 'industry', format: 'text' },
    currency: { labelKey: 'currency', format: 'text' },
    rsScore1W: { labelKey: 'technicalScore1W', format: 'integer' },
    rsScore1M: { labelKey: 'technicalScore1M', format: 'integer' },
    rsScore4M: { labelKey: 'technicalScore4M', format: 'integer' },
    marketCap: { labelKey: 'marketCap', format: 'compact' },
    sharesOutstanding: { labelKey: 'sharesOutstanding', format: 'compact' },
    location: { labelKey: 'location', format: 'text' },
    dividendDate: { labelKey: 'dividendDate', format: 'date' },
    dividendYield: { labelKey: 'dividendYield', format: 'ratio' },
    bookValue: { labelKey: 'bookValue', format: 'number' },
    peg: { labelKey: 'pegRatio', format: 'number' },
    pe: { labelKey: 'peRatio', format: 'number' },
    ps: { labelKey: 'psRatio', format: 'number' },
    allTimeHigh: { labelKey: 'allTimeHigh', format: 'number' },
    allTimeLow: { labelKey: 'allTimeLow', format: 'number' },
    week52High: { labelKey: 'fiftyTwoWeekHigh', format: 'number' },
    week52Low: { labelKey: 'fiftyTwoWeekLow', format: 'number' },
    offWeek52High: { labelKey: 'percOffWeekHigh', format: 'ratio' },
    offWeek52Low: { labelKey: 'percOffWeekLow', format: 'ratio' },
    rsi: { labelKey: 'rsi', format: 'integer' },
    gap: { labelKey: 'gap', format: 'percent' },
    adv1W: { labelKey: 'adv1W', format: 'percent' },
    adv1M: { labelKey: 'adv1M', format: 'percent' },
    adv4M: { labelKey: 'adv4M', format: 'percent' },
    adv1Y: { labelKey: 'adv1Y', format: 'percent' },
    relVolume1W: { labelKey: 'relativeVolume1W', format: 'number' },
    relVolume1M: { labelKey: 'relativeVolume1M', format: 'number' },
    relVolume6M: { labelKey: 'relativeVolume6M', format: 'number' },
    relVolume1Y: { labelKey: 'relativeVolume1Y', format: 'number' },
    avgVolume1W: { labelKey: 'avgVolume1W', format: 'compact' },
    avgVolume1M: { labelKey: 'avgVolume1M', format: 'compact' },
    avgVolume6M: { labelKey: 'avgVolume6M', format: 'compact' },
    avgVolume1Y: { labelKey: 'avgVolume1Y', format: 'compact' },
    fundCategory: { labelKey: 'fundCategory', format: 'text' },
    fundFamily: { labelKey: 'fundFamily', format: 'text' },
    netExpenseRatio: { labelKey: 'netExpenseRatio', format: 'percent' },
    intrinsicValue: { labelKey: 'intrinsicValue', format: 'number' },
    cagr: { labelKey: 'cagr', format: 'ratio' },
    cagrYears: { labelKey: 'cagrYears', format: 'integer' },
    website: { labelKey: 'companyWebsite', format: 'link' },
    aiRecommendation: { labelKey: 'aiRecommendation', format: 'text' },
    description: { labelKey: 'description', format: 'prose' },
};

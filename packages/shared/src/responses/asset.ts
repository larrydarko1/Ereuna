/**
 * Response schemas for one asset — search results, the profile behind the chart
 * sidebar, its corporate events and its financial statements (see
 * responses/identity.ts for how `send()` uses them).
 * Every numeric field is a real number or null: the raw documents carry missing
 * values as 0, as NaN and as the string "NaN", and the API normalises all three
 * away before answering.
 */
import { z } from 'zod';

/** One row of GET /charts/search */
export const assetSummarySchema = z.object({
    symbol: z.string(),
    name: z.string().nullable(),
    isin: z.string().nullable(),
    exchange: z.string().nullable(),
    assetType: z.string().nullable(),
    currency: z.string().nullable(),
    sector: z.string().nullable(),
    marketCap: z.number().nullable(),
});

/** GET /charts/search */
export const assetSearchSchema = z.object({ items: z.array(assetSummarySchema) });

const tradeSignalSchema = z.object({
    date: z.string(), // ISO date
    direction: z.enum(['BUY', 'SELL']),
    strategy: z.string(), // e.g. RSI_Oversold, MACD_Bullish_Cross
    description: z.string(),
    price: z.number().nullable(),
    indicatorValue: z.number().nullable(),
});

/** GET /charts/:symbol/profile */
export const assetProfileSchema = z.object({
    symbol: z.string(),
    name: z.string().nullable(),
    assetType: z.string().nullable(),
    exchange: z.string().nullable(),
    isin: z.string().nullable(),
    ipo: z.string().nullable(), // ISO date
    sector: z.string().nullable(),
    industry: z.string().nullable(),
    currency: z.string().nullable(),
    location: z.string().nullable(),
    website: z.string().nullable(),
    description: z.string().nullable(),
    delisted: z.boolean(),
    marketCap: z.number().nullable(),
    sharesOutstanding: z.number().nullable(),
    bookValue: z.number().nullable(),
    pe: z.number().nullable(),
    peg: z.number().nullable(),
    ps: z.number().nullable(),
    pb: z.number().nullable(),
    cagr: z.number().nullable(),
    cagrYears: z.number().nullable(),
    dividendYield: z.number().nullable(),
    dividendDate: z.string().nullable(),
    rsi: z.number().nullable(),
    gap: z.number().nullable(),
    rsScore1W: z.number().nullable(),
    rsScore1M: z.number().nullable(),
    rsScore4M: z.number().nullable(),
    allTimeHigh: z.number().nullable(),
    allTimeLow: z.number().nullable(),
    week52High: z.number().nullable(),
    week52Low: z.number().nullable(),
    offWeek52High: z.number().nullable(),
    offWeek52Low: z.number().nullable(),
    avgVolume1W: z.number().nullable(),
    avgVolume1M: z.number().nullable(),
    avgVolume6M: z.number().nullable(),
    avgVolume1Y: z.number().nullable(),
    relVolume1W: z.number().nullable(),
    relVolume1M: z.number().nullable(),
    relVolume6M: z.number().nullable(),
    relVolume1Y: z.number().nullable(),
    adv1W: z.number().nullable(),
    adv1M: z.number().nullable(),
    adv4M: z.number().nullable(),
    adv1Y: z.number().nullable(),
    fundCategory: z.string().nullable(),
    fundFamily: z.string().nullable(),
    netExpenseRatio: z.number().nullable(),
    signals: z.array(tradeSignalSchema),
});

/** A dividend (`amount`) or a split (`ratio`) — exactly one of the two is set. */
const corporateActionSchema = z.object({
    date: z.string(), // YYYY-MM-DD
    amount: z.number().exactOptional(), // Dividend cash per share
    ratio: z.number().exactOptional(), // Split factor: above one is a forward split, below one a reverse
});

/** GET /charts/:symbol/events */
export const chartEventsSchema = z.object({
    earnings: z.array(z.string()), // Fiscal period end dates, YYYY-MM-DD
    dividends: z.array(corporateActionSchema),
    splits: z.array(corporateActionSchema),
});

export type StatementField = (typeof STATEMENT_FIELDS)[number];
export type AssetSummary = z.infer<typeof assetSummarySchema>;
export type TradeSignal = z.infer<typeof tradeSignalSchema>;
export type AssetProfile = z.infer<typeof assetProfileSchema>;
export type ChartEvents = z.infer<typeof chartEventsSchema>;
export type Statement = z.infer<typeof statementSchema>;
export type Financials = z.infer<typeof financialsSchema>;

/**
 * The statement line items an answer may carry: the vendor's data codes that the
 * financials table has a label for in every locale. A code the vendor starts
 * sending is dropped until it is named here and translated — an unnamed line in
 * a table is a raw identifier the reader cannot interpret.
 */
export const STATEMENT_FIELDS = [
    'rps',
    'roa',
    'assetTurnover',
    'bookVal',
    'bvps',
    'totalRevenue',
    'epsDil',
    'netIncome',
    'profitMargin',
    'revenueQoQ',
    'debtEquity',
    'grossMargin',
    'roe',
    'currentRatio',
    'fxRate',
    'sharesBasic',
    'piotroskiFScore',
    'longTermDebtEquity',
    'opMargin',
    'epsQoQ',
    'peRatio',
    'shareswaDil',
    'eps',
    'ppeq',
    'ebitda',
    'freeCashFlow',
    'issrepayDebt',
    'capex',
    'rnd',
    'sga',
    'investmentsCurrent',
    'payDiv',
    'investmentsAcqDisposals',
    'taxLiabilities',
    'ncff',
    'opinc',
    'nonControllingInterests',
    'assetsNonCurrent',
    'taxAssets',
    'issrepayEquity',
    'ncfx',
    'ncfo',
    'grossProfit',
    'debtCurrent',
    'retainedEarnings',
    'liabilitiesNonCurrent',
    'sbcomp',
    'businessAcqDisposals',
    'liabilitiesCurrent',
    'acctRec',
    'cashAndEq',
    'accoci',
    'depamor',
    'assetsCurrent',
    'shareswa',
    'investments',
    'prefDVDs',
    'intangibles',
    'opex',
    'inventory',
    'deposits',
    'ebt',
    'netMargin',
    'investmentsNonCurrent',
    'totalAssets',
    'deferredRev',
    'taxExp',
    'debt',
    'costRev',
    'acctPay',
    'ncf',
    'netIncDiscOps',
    'totalLiabilities',
    'ncfi',
    'debtNonCurrent',
    'ebit',
    'netIncComStock',
    'intexp',
    'consolidatedIncome',
    'equity',
    'marketCap',
    'enterpriseVal',
    'shareFactor',
    'trailingPEG1Y',
    'pbRatio',
    'reportedEPS',
] as const;

/** One filed period: its end date, and every named line item the filing carried. */
const statementSchema = z.object({
    fiscalDateEnding: z.string(),
    figures: z.partialRecord(z.enum(STATEMENT_FIELDS), z.number().nullable()),
});

/** GET /market/:symbol/financials — newest period first. */
export const financialsSchema = z.object({
    symbol: z.string(),
    annual: z.array(statementSchema),
    quarterly: z.array(statementSchema),
});

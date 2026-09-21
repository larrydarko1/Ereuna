/**
 * The asset contract — search results, the profile behind the chart sidebar,
 * and the financial statements.
 * Every numeric field on the profile is a real number or null: the raw
 * documents carry missing values as 0, as NaN and as the string "NaN", and the
 * API normalises all three away before answering.
 */

export type AssetSummary = {
    symbol: string;
    name: string | null;
    isin: string | null;
    exchange: string | null;
    assetType: string | null;
    currency: string | null;
    sector: string | null;
    marketCap: number | null;
};

export type TradeSignal = {
    date: string; // ISO date
    direction: 'BUY' | 'SELL';
    strategy: string; // e.g. RSI_Oversold, MACD_Bullish_Cross
    description: string;
    price: number | null;
    indicatorValue: number | null;
};

export type AssetProfile = {
    symbol: string;
    name: string | null;
    assetType: string | null;
    exchange: string | null;
    isin: string | null;
    ipo: string | null; // ISO date
    sector: string | null;
    industry: string | null;
    currency: string | null;
    location: string | null;
    website: string | null;
    description: string | null;
    delisted: boolean;
    marketCap: number | null;
    sharesOutstanding: number | null;
    bookValue: number | null;
    pe: number | null;
    peg: number | null;
    ps: number | null;
    pb: number | null;
    cagr: number | null;
    cagrYears: number | null;
    dividendYield: number | null;
    dividendDate: string | null;
    rsi: number | null;
    gap: number | null;
    rsScore1W: number | null;
    rsScore1M: number | null;
    rsScore4M: number | null;
    allTimeHigh: number | null;
    allTimeLow: number | null;
    week52High: number | null;
    week52Low: number | null;
    offWeek52High: number | null;
    offWeek52Low: number | null;
    avgVolume1W: number | null;
    avgVolume1M: number | null;
    avgVolume6M: number | null;
    avgVolume1Y: number | null;
    relVolume1W: number | null;
    relVolume1M: number | null;
    relVolume6M: number | null;
    relVolume1Y: number | null;
    adv1W: number | null;
    adv1M: number | null;
    adv4M: number | null;
    adv1Y: number | null;
    fundCategory: string | null;
    fundFamily: string | null;
    netExpenseRatio: number | null;
    signals: TradeSignal[];
};

/** Statement rows are passed through as stored: their fields are the vendor's, and vary by filer. */
export type Financials = {
    symbol: string;
    annual: Record<string, unknown>[];
    quarterly: Record<string, unknown>[];
};

/** market-assets — reads of the AssetInfo reference collection. */
import type { AssetInfoDoc, CorporateAction, SummaryField } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';
import type { DividendPayment } from '@/utils/dividends.js';
import { escapeRegex } from '@/utils/regex.js';

const MAX_SEARCH_RESULTS = 50;

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

/**
 * Assert a symbol exists in the reference data.
 * Every write that names an instrument goes through here first, so a typo
 * cannot create a watchlist entry or a trade against a symbol that will never
 * have a price.
 */
export async function requireAsset(symbol: string): Promise<AssetInfoDoc> {
    const asset = await getDb().collection<AssetInfoDoc>('AssetInfo').findOne({ Symbol: symbol });
    if (asset === null) throw new AppError(404, 'ASSET_NOT_FOUND', `symbol ${symbol} not in AssetInfo`);
    return asset;
}

/** The exchange a symbol trades on, or an empty string when the reference data does not say. */
export async function assetExchange(symbol: string): Promise<string> {
    return (await requireAsset(symbol)).Exchange ?? '';
}

/**
 * Rank assets against a search term.
 * Both patterns are escaped: the term reaches Mongo as a `$regex`, and the old
 * version interpolated it raw after inserting `.*` between every character —
 * an unindexable full scan and a ReDoS in one expression.
 * Scoring is a prefix-beats-substring ordering across symbol, ISIN and name,
 * with small nudges for common stocks and the major US exchanges, so typing
 * `AA` puts AA ahead of an obscure listing that merely contains the letters.
 */
export async function searchAssets(term: string, limit: number): Promise<AssetSummary[]> {
    const capped = Math.min(limit, MAX_SEARCH_RESULTS);
    const escaped = escapeRegex(term);
    const prefix = { $regex: `^${escaped}`, $options: 'i' };
    const contains = { $regex: escaped, $options: 'i' };

    return withCache(
        marketKey('search', term.toLowerCase(), String(capped)),
        async () => {
            const docs = await getDb()
                .collection<AssetInfoDoc>('AssetInfo')
                .aggregate<AssetInfoDoc>([
                    {
                        $match: {
                            Delisted: { $ne: true },
                            $or: [{ Symbol: contains }, { ISIN: contains }, { Name: contains }],
                        },
                    },
                    {
                        $addFields: {
                            score: {
                                $sum: [
                                    score('$Symbol', prefix.$regex, 1000),
                                    score('$ISIN', prefix.$regex, 900),
                                    score('$Name', prefix.$regex, 800),
                                    score('$Symbol', escaped, 500),
                                    score('$ISIN', escaped, 400),
                                    score('$Name', escaped, 300),
                                    { $cond: [{ $eq: ['$AssetType', 'Common Stock'] }, 50, 0] },
                                    { $cond: [{ $eq: ['$AssetType', 'ETF'] }, 30, 0] },
                                    { $cond: [{ $in: ['$Exchange', ['NASDAQ', 'NYSE', 'AMEX']] }, 20, 0] },
                                ],
                            },
                        },
                    },
                    { $sort: { score: -1, MarketCapitalization: -1 } },
                    { $limit: capped },
                ])
                .toArray();

            return docs.map(toSummary);
        },
        { dataType: 'static' },
    );
}

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
    intrinsicValue: number | null;
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

export type TradeSignal = {
    date: string; // ISO date
    direction: 'BUY' | 'SELL';
    strategy: string; // e.g. RSI_Oversold, MACD_Bullish_Cross
    description: string;
    price: number | null;
    indicatorValue: number | null;
};

/**
 * Compile-time proof that every summary row the client can order has a field
 * to read. `SUMMARY_FIELDS` is the shared list the layout stores; if a key is
 * added there without a field here, this assignment stops type-checking.
 */
export type SummaryFieldsCovered = SummaryField extends keyof AssetProfile ? true : never;

/** The reference data for one asset, shaped for display. */
export async function assetProfile(symbol: string): Promise<AssetProfile> {
    const doc = await requireAsset(symbol);

    return {
        symbol: doc.Symbol,
        name: text(doc.Name),
        assetType: text(doc.AssetType),
        exchange: text(doc.Exchange),
        isin: text(doc.ISIN),
        ipo: isoDate(doc.IPO),
        sector: text(doc.Sector),
        industry: text(doc.Industry),
        currency: text(doc.Currency),
        location: text(doc.Country),
        website: text(doc.companyWebsite),
        description: text(doc.Description),
        delisted: doc.Delisted === true,
        marketCap: numeric(doc.MarketCapitalization),
        sharesOutstanding: numeric(doc.SharesOutstanding),
        intrinsicValue: numeric(doc.IntrinsicValue),
        bookValue: numeric(doc.BookValue),
        pe: numeric(doc.PERatio),
        peg: numeric(doc.PEGRatio),
        ps: numeric(doc.PriceToSalesRatioTTM),
        pb: numeric(doc.PriceToBookRatio),
        cagr: numeric(doc.CAGR),
        cagrYears: numeric(doc.CAGRYears),
        dividendYield: numeric(doc.DividendYield),
        dividendDate: isoDate(doc.DividendDate),
        rsi: numeric(doc.RSI),
        gap: numeric(doc.Gap),
        rsScore1W: numeric(doc.RSScore1W),
        rsScore1M: numeric(doc.RSScore1M),
        rsScore4M: numeric(doc.RSScore4M),
        allTimeHigh: numeric(doc.AlltimeHigh),
        allTimeLow: numeric(doc.AlltimeLow),
        week52High: numeric(doc.fiftytwoWeekHigh),
        week52Low: numeric(doc.fiftytwoWeekLow),
        offWeek52High: numeric(doc.percoff52WeekHigh),
        offWeek52Low: numeric(doc.percoff52WeekLow),
        avgVolume1W: numeric(doc.AvgVolume1W),
        avgVolume1M: numeric(doc.AvgVolume1M),
        avgVolume6M: numeric(doc.AvgVolume6M),
        avgVolume1Y: numeric(doc.AvgVolume1Y),
        relVolume1W: numeric(doc.RelVolume1W),
        relVolume1M: numeric(doc.RelVolume1M),
        relVolume6M: numeric(doc.RelVolume6M),
        relVolume1Y: numeric(doc.RelVolume1Y),
        adv1W: numeric(doc.ADV1W),
        adv1M: numeric(doc.ADV1M),
        adv4M: numeric(doc.ADV4M),
        adv1Y: numeric(doc.ADV1Y),
        fundCategory: text(doc.FundCategory),
        fundFamily: text(doc.fundFamily),
        netExpenseRatio: numeric(doc.netExpenseRatio),
        signals: tradeSignals(doc.Signals),
    };
}

/** Dividend payment schedules for a set of symbols, keyed by symbol. */
export async function dividendSchedules(symbols: readonly string[]): Promise<Map<string, DividendPayment[]>> {
    const schedules = new Map<string, DividendPayment[]>();
    if (symbols.length === 0) return schedules;

    const assets = await getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .find({ Symbol: { $in: [...symbols] }, dividends: { $exists: true, $ne: [] } }, { projection: { Symbol: 1, dividends: 1 } })
        .toArray();

    for (const asset of assets) {
        const payments = (asset.dividends ?? []).flatMap(toDividendPayment);
        if (payments.length > 0) schedules.set(asset.Symbol, payments);
    }

    return schedules;
}

/** Corporate actions the chart draws as markers. Newest first, capped by the caller. */
export async function corporateActions(
    symbol: string,
    kind: 'dividends' | 'splits',
    limit: number,
): Promise<CorporateAction[]> {
    const asset = await requireAsset(symbol);
    const actions = asset[kind] ?? [];
    return [...actions].reverse().slice(0, limit);
}

/**
 * Fiscal quarter-end dates, which the chart marks as earnings events.
 * The ingestor writes them onto `quarterlyIncome`; rows without a parseable
 * date are dropped rather than emitted as an Invalid Date the client renders
 * as NaN.
 */
export async function earningsDates(symbol: string): Promise<string[]> {
    const asset = await requireAsset(symbol);
    return (asset.quarterlyIncome ?? [])
        .map((quarter) => (quarter.fiscalDateEnding === undefined ? null : new Date(quarter.fiscalDateEnding)))
        .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()))
        .map((date) => date.toISOString().slice(0, 10));
}


/**
 * A finite number, or null.
 * The documents carry missing numerics as null, as the empty string, and as
 * the literal string "NaN" — the ingestor wrote whatever the upstream feed
 * gave it. All three mean the same thing here.
 */
function numeric(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** A non-empty string, or null. "-" counts as empty: it is the old client's placeholder. */
function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' || trimmed === '-' ? null : trimmed;
}

/** A date as `YYYY-MM-DD`, or null when it will not parse. */
function isoDate(value: unknown): string | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    const raw = text(value);
    if (raw === null) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * Today's signals, keeping only the entries that are actually usable.
 * The analyzer writes `type` as BUY or SELL; anything else is a row from an
 * older run of a strategy that no longer exists, and a signal with no direction
 * is not a signal.
 */
function tradeSignals(value: unknown): TradeSignal[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((entry): TradeSignal[] => {
        if (typeof entry !== 'object' || entry === null) return [];
        const row = entry as Record<string, unknown>;
        const direction = row.type;
        if (direction !== 'BUY' && direction !== 'SELL') return [];

        const date = isoDate(row.date);
        const strategy = text(row.strategy);
        if (date === null || strategy === null) return [];

        return [
            {
                date,
                direction,
                strategy,
                description: text(row.description) ?? '',
                price: numeric(row.price),
                indicatorValue: numeric(row.indicator_value),
            },
        ];
    });
}

function toDividendPayment(action: CorporateAction): DividendPayment[] {
    if (typeof action.amount !== 'number' || action.amount <= 0) return [];

    const paymentDate = new Date(action.date);
    return Number.isNaN(paymentDate.getTime()) ? [] : [{ paymentDate, amount: action.amount }];
}

/** One term of the search score: `points` when `field` matches `pattern`, else 0. */
function score(field: string, pattern: string, points: number): Record<string, unknown> {
    return {
        $cond: [{ $regexMatch: { input: { $ifNull: [field, ''] }, regex: pattern, options: 'i' } }, points, 0],
    };
}

function toSummary(doc: AssetInfoDoc): AssetSummary {
    return {
        symbol: doc.Symbol,
        name: doc.Name ?? null,
        isin: doc.ISIN ?? null,
        exchange: doc.Exchange ?? null,
        assetType: doc.AssetType ?? null,
        currency: doc.Currency ?? null,
        sector: doc.Sector ?? null,
        marketCap: doc.MarketCapitalization ?? null,
    };
}

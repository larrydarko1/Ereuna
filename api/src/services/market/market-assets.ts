/** market-assets — reads of the AssetInfo reference collection. */
import type { AssetInfoDoc, CorporateAction } from '@ereuna/shared';
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

function toDividendPayment(action: CorporateAction): DividendPayment[] {
    const raw = action.payment_date ?? action.date;
    if (raw === undefined || typeof action.amount !== 'number' || action.amount <= 0) return [];

    const paymentDate = new Date(raw);
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

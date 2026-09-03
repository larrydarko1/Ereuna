/**
 * The ratios that need a price and a filing together.
 * Runs after both the metrics pass (which writes the latest close) and the
 * fundamentals pass (which writes the latest filing), because every figure here
 * is one divided by the other. Splitting it out is what lets the other two stay
 * independent of each other.
 */
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import type { Statement } from '@/organize/fundamentals.js';
import { intrinsicValue } from '@/organize/intrinsic-value.js';
import { setOn, writeAssetInfo } from '@/organize/write.js';
import { numeric, round } from '@/utils/indicators.js';

/** Trailing twelve months, in days — the window a dividend yield covers. */
const TTM_DAYS = 365;

export async function updateValuations(now = new Date()): Promise<number> {
    const cursor = getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .find(
            { Delisted: { $ne: true } },
            {
                projection: {
                    _id: 0,
                    Symbol: 1,
                    TimeSeries: 1,
                    SharesOutstanding: 1,
                    quarterlyFinancials: 1,
                    dividends: 1,
                    splits: 1,
                },
            },
        );

    const operations: AnyBulkWriteOperation<AssetInfoDoc>[] = [];
    let valued = 0;

    for await (const doc of cursor) {
        operations.push(setOn(doc.Symbol, valuationFor(doc, now)));
        valued += 1;
    }

    await writeAssetInfo(operations);
    logger.info({ valued }, 'Valuations updated');
    return valued;
}

function valuationFor(doc: AssetInfoDoc, now: Date): Record<string, unknown> {
    const price = numeric((doc.TimeSeries as { close?: unknown } | undefined)?.close);
    const shares = numeric(doc.SharesOutstanding);
    const quarterly = Array.isArray(doc.quarterlyFinancials) ? (doc.quarterlyFinancials as Statement[]) : [];
    const latest = quarterly[0];
    const marketCap = price === null || shares === null ? null : price * shares;

    return {
        PERatio: ratio(price, numeric(latest?.reportedEPS)),
        PriceToBookRatio: ratio(price, perShare(numeric(latest?.bookVal), shares)),
        PriceToSalesRatioTTM: ratio(price, perShare(numeric(latest?.totalRevenue), shares)),
        PEGRatio: pegRatio(price, quarterly),
        EV: enterpriseValue(marketCap, latest),
        DividendYield: dividendYield(doc, price, now),
        IntrinsicValue: intrinsicValue({
            quarterly,
            sharesOutstanding: shares,
            splits: Array.isArray(doc.splits) ? doc.splits : [],
            price,
            now,
        }),
    };
}

/**
 * Price against a growth-adjusted earnings multiple.
 * Null when earnings shrank: a P/E divided by a negative growth rate produces a
 * negative PEG, which sorts as the cheapest thing on the screen and means the
 * opposite of that.
 */
function pegRatio(price: number | null, quarterly: readonly Statement[]): number | null {
    const pe = ratio(price, numeric(quarterly[0]?.reportedEPS));
    const current = numeric(quarterly[0]?.reportedEPS);
    const previous = numeric(quarterly[1]?.reportedEPS);
    if (pe === null || current === null || previous === null || previous <= 0) return null;

    const growth = (current - previous) / previous;
    return growth <= 0 ? null : round(pe / (growth * 100), 2);
}

/** What it would cost to buy the business outright: market cap plus debt, less cash. */
function enterpriseValue(marketCap: number | null, latest: Statement | undefined): number | null {
    if (marketCap === null || latest === undefined) return null;
    const debt = numeric(latest.debt);
    const cash = numeric(latest.cashAndEq);
    if (debt === null || cash === null) return null;
    return round(marketCap + debt - cash, 2);
}

/** Dividends paid over the trailing year, as a fraction of the current price. */
function dividendYield(doc: AssetInfoDoc, price: number | null, now: Date): number | null {
    if (price === null || price <= 0 || !Array.isArray(doc.dividends)) return null;

    const cutoff = now.getTime() - TTM_DAYS * 86_400_000;
    let paid = 0;

    for (const dividend of doc.dividends) {
        const at = new Date(dividend.date).getTime();
        if (Number.isNaN(at) || at < cutoff) continue;
        paid += dividend.amount ?? 0;
    }

    return paid === 0 ? null : round(paid / price, 4);
}

/** `numerator / denominator`, or null when the result would not be a ratio. */
function ratio(numerator: number | null, denominator: number | null): number | null {
    if (numerator === null || denominator === null || denominator <= 0) return null;
    return round(numerator / denominator, 2);
}

function perShare(total: number | null, shares: number | null): number | null {
    if (total === null || shares === null || shares <= 0) return null;
    return total / shares;
}

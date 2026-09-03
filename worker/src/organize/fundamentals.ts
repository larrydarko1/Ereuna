/** Financial statements, and the figures taken straight off the latest one. */
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import { logger } from '@/lib/logger.js';
import { statements, type VendorStatement, type VendorStatementItem } from '@/lib/tiingo.js';
import { chunk, type Asset } from '@/organize/universe.js';
import { setOn, writeAssetInfo } from '@/organize/write.js';
import { numeric, round } from '@/utils/indicators.js';

/** Symbols whose statements are fetched and written before the next batch starts. */
const BATCH_SIZE = 200;

/** One period's figures: the three headline numbers plus every code the vendor sent. */
export type Statement = {
    fiscalDateEnding: Date;
    reportedEPS: number;
    totalRevenue: number;
    netIncome: number;
    [dataCode: string]: unknown;
};

/**
 * Refresh statements for the whole universe.
 * Every symbol is fetched, because the vendor has no "changed since" endpoint
 * and a restatement is not a new period — but only the symbols whose set of
 * period dates actually moved are written.
 */
export async function updateFundamentals(universe: readonly Asset[]): Promise<number> {
    let changed = 0;

    // Batched rather than one Promise.all over the universe: a statement set is
    // forty quarters of fifty fields, and holding ten thousand of them until a
    // single write at the end is most of the run's memory for no benefit
    for (const batch of chunk(universe, BATCH_SIZE)) {
        const operations: AnyBulkWriteOperation<AssetInfoDoc>[] = [];

        await Promise.all(
            batch.map(async (asset) => {
                try {
                    const { quarterly, annual } = partition(await statements(asset.symbol));
                    if (quarterly.length === 0 && annual.length === 0) return;

                    changed += 1;
                    operations.push(
                        setOn(asset.symbol, {
                            quarterlyFinancials: quarterly,
                            AnnualFinancials: annual,
                            ...derivedFrom(quarterly, asset),
                        }),
                    );
                } catch (err) {
                    logger.debug({ err, symbol: asset.symbol }, 'Statements unavailable');
                }
            }),
        );

        await writeAssetInfo(operations);
    }

    logger.info({ changed, universe: universe.length }, 'Fundamentals updated');
    return changed;
}

/** Split the vendor's statements into quarterly and annual, newest first. */
function partition(rows: readonly VendorStatement[]): { quarterly: Statement[]; annual: Statement[] } {
    const quarterly: Statement[] = [];
    const annual: Statement[] = [];

    for (const row of rows) {
        const statement = toStatement(row);
        if (statement === null) continue;
        // The vendor marks an annual report as quarter zero
        if (row.quarter === 0) annual.push(statement);
        else quarterly.push(statement);
    }

    const newestFirst = (left: Statement, right: Statement): number =>
        right.fiscalDateEnding.getTime() - left.fiscalDateEnding.getTime();

    return { quarterly: quarterly.sort(newestFirst), annual: annual.sort(newestFirst) };
}

/**
 * One vendor statement, flattened.
 * The four sections are merged into one object because that is how they are
 * read — the screener addresses `quarterlyFinancials.0.currentRatio` without
 * caring that the vendor filed it under `overview`.
 */
function toStatement(row: VendorStatement): Statement | null {
    if (row.date === undefined) return null;
    const fiscalDateEnding = new Date(row.date);
    if (Number.isNaN(fiscalDateEnding.getTime())) return null;

    const statement: Statement = { fiscalDateEnding, reportedEPS: 0, totalRevenue: 0, netIncome: 0 };
    const data = row.statementData ?? {};

    for (const section of [data.incomeStatement, data.balanceSheet, data.cashFlow, data.overview]) {
        for (const item of section ?? []) {
            if (item.dataCode === undefined) continue;
            statement[item.dataCode] = item.value ?? 0;
        }
    }

    statement.reportedEPS = codeValue(data.incomeStatement, 'eps');
    statement.totalRevenue = codeValue(data.incomeStatement, 'revenue');
    statement.netIncome = codeValue(data.incomeStatement, 'netinc');
    return statement;
}

/**
 * The fields lifted out of the newest quarter and the growth rates against it.
 * Quarter-on-quarter compares consecutive filings; year-on-year compares a
 * quarter with the same quarter four filings back, which is what makes it
 * immune to seasonality — the whole reason the two are reported separately.
 */
function derivedFrom(quarterly: readonly Statement[], asset: Asset): Record<string, unknown> {
    const latest = quarterly[0];
    if (latest === undefined) return {};

    const shares = numeric(latest.sharesBasic) ?? asset.sharesOutstanding;
    const cash = numeric(latest.cashAndEq) ?? 0;
    const debt = numeric(latest.debt) ?? 0;

    return {
        EPS: latest.reportedEPS,
        ...(shares === null ? {} : { SharesOutstanding: shares }),
        BookValue: numeric(latest.bookVal),
        NetCash: round(cash - debt, 2),

        EPSQoQ: growth(quarterly, 1, 'reportedEPS'),
        EarningsQoQ: growth(quarterly, 1, 'netIncome'),
        RevQoQ: growth(quarterly, 1, 'totalRevenue'),
        EPSYoY: growth(quarterly, 4, 'reportedEPS'),
        EarningsYoY: growth(quarterly, 4, 'netIncome'),
        RevYoY: growth(quarterly, 4, 'totalRevenue'),
    };
}

/**
 * Fractional growth of `field` from `back` filings ago to the newest one.
 * Null when the earlier figure is zero or negative: a percentage change out of
 * a loss has no sign anyone can read, and the Python's zero-guard reported it
 * as flat, which put every company that had just returned to profit at 0%.
 */
function growth(quarterly: readonly Statement[], back: number, field: keyof Statement): number | null {
    const current = numeric(quarterly[0]?.[field]);
    const previous = numeric(quarterly[back]?.[field]);
    if (current === null || previous === null || previous <= 0) return null;
    return round((current - previous) / previous, 4);
}

function codeValue(section: readonly VendorStatementItem[] | undefined, code: string): number {
    return numeric(section?.find((item) => item.dataCode === code)?.value) ?? 0;
}

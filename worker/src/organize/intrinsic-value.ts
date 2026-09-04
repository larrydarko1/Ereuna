/**
 * Discounted cash flow: what the business is worth per share on its own cash
 * generation, independent of what the market is paying today.
 */
import type { Statement } from '@/organize/fundamentals.js';
import { numeric, round, standardDeviation } from '@/utils/indicators.js';

export type ValuationInput = {
    quarterly: readonly Statement[];
    sharesOutstanding: number | null;
    splits: readonly { ratio?: number }[];
    price: number | null;
    now?: Date;
};

/** Quarters of free cash flow needed: five years, so the growth rate spans four. */
const REQUIRED_QUARTERS = 20;
const FORECAST_YEARS = 5;
const DISCOUNT_RATE = 0.1;
const TERMINAL_GROWTH = 0.025;

/** Above this coefficient of variation the series is noise, not a trend. */
const MAX_FCF_VARIATION = 2;
const MAX_EPS_VARIATION = 3;
const MAX_DEBT_TO_EQUITY = 10;
const MAX_REVERSE_SPLITS = 5;
const MAX_STALENESS_DAYS = 365;

export function intrinsicValue(input: ValuationInput): number | null {
    const { quarterly, sharesOutstanding, splits, price } = input;
    const now = input.now ?? new Date();
    const latest = quarterly[0];

    if (latest === undefined || sharesOutstanding === null || sharesOutstanding <= 0) return null;
    if (quarterly.length < REQUIRED_QUARTERS) return null;
    if (staleDays(latest, now) > MAX_STALENESS_DAYS) return null;

    const equity = numeric(latest.equity);
    if (equity === null || equity <= 0) return null;

    const debt = numeric(latest.debt) ?? 0;
    if (Math.abs(debt / equity) > MAX_DEBT_TO_EQUITY) return null;

    // A company that has reverse-split this often is managing a share price,
    // not a business, and its per-share history is not comparable to itself
    if (splits.filter((split) => (split.ratio ?? 1) < 1).length >= MAX_REVERSE_SPLITS) return null;
    if (!isProfitable(quarterly)) return null;

    const annual = annualCashFlows(quarterly);
    if (annual === null) return null;

    const base = annual[0];
    const oldest = annual[annual.length - 1];
    if (base === undefined || oldest === undefined || base <= 0) return null;
    if (variation(annual) > MAX_FCF_VARIATION) return null;

    const growth = oldest > 0 ? (base / oldest) ** (1 / (annual.length - 1)) - 1 : 0;
    const projected = Array.from({ length: FORECAST_YEARS }, (_, year) => base * (1 + growth) ** (year + 1));
    const discounted = projected.reduce((sum, flow, year) => sum + flow / (1 + DISCOUNT_RATE) ** (year + 1), 0);

    const final = projected[projected.length - 1] ?? 0;
    const terminal = (final * (1 + TERMINAL_GROWTH)) / (DISCOUNT_RATE - TERMINAL_GROWTH);
    const discountedTerminal = terminal / (1 + DISCOUNT_RATE) ** FORECAST_YEARS;

    // Net cash belongs to the shareholder on top of the operating business.
    // Both sides come from `debt`; the Python subtracted `totalDebt`, a code the
    // vendor does not send, so its net cash was gross cash for every company
    const netCash = (numeric(latest.cashAndEq) ?? 0) - debt;
    const perShare = (discounted + discountedTerminal + netCash) / sharesOutstanding;

    if (!Number.isFinite(perShare) || perShare <= 0) return null;
    // A valuation this far above the traded price is an arithmetic artefact of
    // a restated share count, not a hundredfold mispricing anyone has found
    if (price !== null && price > 0 && perShare / price > 100) return null;

    return round(perShare, 2);
}

function isProfitable(quarterly: readonly Statement[]): boolean {
    const recent = quarterly.slice(0, 12);
    const earnings = recent
        .map((statement) => numeric(statement.netIncome))
        .filter((value): value is number => value !== null);
    if (earnings.length >= 12 && earnings.filter((value) => value > 0).length < 6) return false;

    const eps = recent
        .map((statement) => numeric(statement.reportedEPS))
        .filter((value): value is number => value !== null);
    if (eps.length < 8) return true;
    if (eps.filter((value) => value > 0).length < 4) return false;

    return variation(eps) <= MAX_EPS_VARIATION;
}

function annualCashFlows(quarterly: readonly Statement[]): number[] | null {
    const flows = quarterly
        .slice(0, REQUIRED_QUARTERS)
        .map((statement) => numeric(statement.freeCashFlow))
        .filter((value): value is number => value !== null);
    if (flows.length < REQUIRED_QUARTERS) return null;

    return Array.from({ length: REQUIRED_QUARTERS / 4 }, (_, year) =>
        flows.slice(year * 4, year * 4 + 4).reduce((sum, flow) => sum + flow, 0),
    );
}

/**
 * Coefficient of variation: spread relative to size, so it compares across
 * scales. A mean of zero has no scale to be relative to, and a series centred
 * there is exactly the unstable one the thresholds exist to reject
 */
function variation(values: readonly number[]): number {
    const deviation = standardDeviation(values);
    if (deviation === null) return Infinity;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.abs(mean) < Number.EPSILON ? Infinity : deviation / Math.abs(mean);
}

function staleDays(latest: Statement, now: Date): number {
    const filed = latest.fiscalDateEnding;
    if (!(filed instanceof Date) || Number.isNaN(filed.getTime())) return Infinity;
    return (now.getTime() - filed.getTime()) / 86_400_000;
}

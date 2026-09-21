/**
 * Arithmetic over figures read out of the financial documents. Reading them is
 * `numeric` in the shared package, so the browser, the API and the worker agree
 * on which of the stored shapes counts as a missing number.
 */

/**
 * Percentage growth from `base` to `current`, or null when the base makes the
 * answer meaningless.
 * A negative base is the case worth spelling out: a company that lost $10m and
 * then lost $5m has not grown 50%, and the sign of the arithmetic says it grew
 * when it shrank. There is no percentage to report, so there is none.
 */
export function growth(current: number | null, base: number | null): number | null {
    if (current === null || base === null || base <= 0) return null;
    return ((current - base) / base) * 100;
}

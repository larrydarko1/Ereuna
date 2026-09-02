/**
 * Reading numbers out of data that is not reliably numeric.
 * The financial documents carry figures as numbers, as numeric strings, as 0
 * where a value is missing and as the literal string "NaN"; anything that
 * renders them has to decide what each of those means.
 */

/** A finite number, or null. Numeric strings are accepted; "NaN" and "" are not. */
export function numeric(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

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

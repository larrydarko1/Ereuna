/** Small predicates shared across workspaces. */

/**
 * Narrow an unknown value to a non-empty string.
 * Empty strings count as absent: a blank value would otherwise pass a plain
 * `!= null` check and reach a query or a URL as a silent empty match, so
 * callers treat `''` the same as `null`/`undefined` and fall through.
 */
export function hasValue(value: unknown): value is string {
    return typeof value === 'string' && value !== '';
}

/** True when `value` is a finite number — rejects NaN and Infinity, which `typeof` does not. */
export function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

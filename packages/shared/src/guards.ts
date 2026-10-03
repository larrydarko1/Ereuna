/**
 * Type guards every workspace needs for values that arrive untyped: a parsed
 * JSON body, a Redis payload, a vendor response. Each one is the check that a
 * cast (`value as T`) would have skipped.
 */

/** A plain object. Its fields stay `unknown` until each is checked. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A list. `Array.isArray` narrows to `any[]`; this narrows to `unknown[]`, so each element still gets checked. */
export function isList(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/** One entry of a fixed list (`as const`): `isOneOf(VERDICTS, value)` in place of `value as Verdict`. */
export function isOneOf<const T extends readonly string[]>(list: T, value: unknown): value is T[number] {
    return list.some((item) => item === value);
}

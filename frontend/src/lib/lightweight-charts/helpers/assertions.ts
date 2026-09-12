/**
 * Checks an assertion. Throws if the assertion is failed.
 *
 * @param condition - Result of the assertion evaluation
 * @param message - Text to include in the exception message
 */
// `assert(cond, msg)` is the one signature the rule cannot improve: the boolean IS
// the subject rather than a mode switch, and the message exists only to describe it.
// Splitting it in two would produce assertTrue/assertFalse, worse at every call site.
// eslint-disable-next-line contracts/no-boolean-flag -- the flag is the subject, not a mode
export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message === undefined ? 'Assertion failed' : `Assertion failed: ${message}`);
    }
}

/**
 * The value, or a throw if it is undefined.
 *
 * Named `get` rather than `ensure` because it hands the value back: `ensure`
 * promises only to throw or do nothing, and this does a second job.
 */
export function getDefined(value: undefined): never;
export function getDefined<T>(value: T | undefined): T;
export function getDefined<T>(value: T | undefined): T {
    if (value === undefined) {
        throw new Error('Value is undefined');
    }

    return value;
}

/** The value, or a throw if it is null. See {@link getDefined} on the name. */
export function getNotNull(value: null): never;
export function getNotNull<T>(value: T | null): T;
export function getNotNull<T>(value: T | null): T {
    if (value === null) {
        throw new Error('Value is null');
    }

    return value;
}

/** The value, or a throw if it is null or undefined. */
export function getPresent(value: undefined | null): never;
export function getPresent<T>(value: T | undefined | null): T;
export function getPresent<T>(value: T | undefined | null): T {
    return getNotNull(getDefined(value));
}

/**
 * Compile time check for never
 */
export function ensureNever(_value: never): void {
    // Nothing to do: the compile-time check is the whole point
}

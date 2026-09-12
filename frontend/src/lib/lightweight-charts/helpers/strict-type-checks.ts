/**
 * Represents a type `T` where every property is optional.
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? DeepPartial<U>[]
        : T[P] extends readonly (infer X)[]
          ? readonly DeepPartial<X>[]
          : DeepPartial<T[P]>;
};

type PlainObject = Record<string, unknown>;

/**
 * Deep-merges each source into `dst`, in place, and hands `dst` back.
 *
 * This is what lays a `DeepPartial<Options>` over the chart's defaults, so an
 * option the caller did not name has to survive untouched — which is why a
 * nested object is recursed into rather than replaced wholesale.
 */
export function merge(dst: PlainObject, ...sources: PlainObject[]): PlainObject {
    for (const src of sources) {
        for (const key in src) {
            const value = src[key];
            if (value === undefined) {
                continue;
            }

            const existing = dst[key];

            // An array or a primitive replaces what was there outright; only a
            // nested object that the target already has is merged into
            if (isMergeable(value) && existing !== undefined) {
                merge(existing as PlainObject, value);
            } else {
                dst[key] = value;
            }
        }
    }

    return dst;
}

/**
 * Whether a value is merged into what is already there rather than replacing it.
 *
 * `null` counts, which preserves the `typeof x === 'object'` test this replaced:
 * merging null into an object iterates nothing, so a null in a partial options
 * object leaves the existing value alone instead of erasing it.
 */
function isMergeable(value: unknown): value is PlainObject {
    return typeof value === 'object' && !Array.isArray(value);
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value);
}

export function isInteger(value: unknown): boolean {
    return typeof value === 'number' && value % 1 === 0;
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

/**
 * A structural deep copy. The public API hands options objects out and takes
 * them in; copying detaches them, so a caller holding on to one cannot reach
 * into the chart's own state by mutating it later.
 */
export function clone<T>(object: T): T {
    if (typeof object !== 'object' || object === null) {
        return object;
    }

    if (Array.isArray(object)) {
        return object.map((item: unknown) => clone(item)) as T;
    }

    const copy: PlainObject = {};
    for (const key of Object.keys(object)) {
        copy[key] = clone((object as PlainObject)[key]);
    }

    return copy as T;
}

export function notNull<T>(t: T | null): t is T {
    return t !== null;
}

export function undefinedIfNull<T>(t: T | null): T | undefined {
    return t === null ? undefined : t;
}

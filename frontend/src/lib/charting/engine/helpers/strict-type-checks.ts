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
 * nested object is recursed into rather than replaced wholesale. `dst` is
 * returned as itself, so it keeps the type it came in with.
 */
export function merge<T extends object>(dst: T, ...sources: object[]): T {
    for (const src of sources) {
        mergeInto(dst, src);
    }

    return dst;
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a structural copy has the shape of what it copied, and a type parameter has no runtime form to check that against
    return copyOf(object) as T;
}

export function notNull<T>(t: T | null): t is T {
    return t !== null;
}

export function undefinedIfNull<T>(t: T | null): T | undefined {
    return t ?? undefined;
}

/**
 * Whether a value is merged into what is already there rather than replacing it.
 *
 * `null` counts, which preserves the `typeof x === 'object'` test this replaced:
 * merging null into an object iterates nothing, so a null in a partial options
 * object leaves the existing value alone instead of erasing it.
 */
function isMergeable(value: unknown): value is PlainObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeInto(dst: object, src: object): void {
    for (const key of Object.keys(src)) {
        const value: unknown = Reflect.get(src, key);
        if (value === undefined) {
            continue;
        }

        const existing: unknown = Reflect.get(dst, key);

        // An array or a primitive replaces what was there outright; only a
        // nested object that the target already has is merged into
        if (isMergeable(value) && isMergeable(existing)) {
            mergeInto(existing, value);
        } else {
            Reflect.set(dst, key, value);
        }
    }
}

function copyOf(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(copyOf);
    }

    const copy: PlainObject = {};
    for (const [key, item] of Object.entries(value)) {
        copy[key] = copyOf(item);
    }

    return copy;
}

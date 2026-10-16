/**
 * This is the generic type useful for declaring a nominal type,
 * which does not structurally matches with the base type and
 * the other types declared over the same base type
 *
 * @example
 * ```ts
 * type Index = Nominal<number, 'Index'>;
 * // let i: Index = 42; // this fails to compile
 * let i: Index = 42 as Index; // OK
 * ```
 * @example
 * ```ts
 * type TagName = Nominal<string, 'TagName'>;
 * ```
 */
export type Nominal<T, TName extends string> = T & {
    /** The 'name' or species of the nominal. */
    [Symbol.species]: TName;
};

/**
 * Label a number with its nominal: `nominal<Coordinate>(y)`. A brand exists
 * only at compile time, so there is nothing at runtime to check, and this is
 * the one place the engine mints one.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is the brand being minted, so it can only appear as the result
export function nominal<T extends number>(value: number): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a brand has no runtime form to check; every nominal is minted here
    return value as T;
}

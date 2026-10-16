/**
 * The engine is generic over the caller's own types — its time item, its data
 * item, its options — and stores what the caller gave it without them, because
 * a type parameter has no runtime form to keep. Handing a value back through
 * the public API re-applies the caller's type to what the caller supplied, and
 * that is the one thing nothing at runtime can check. This is where it happens,
 * and it is for nothing else: a value the engine built itself is typed where it
 * is built.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is the caller's type being handed back, so it can only appear as the result
export function callerType<T>(value: unknown): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a type parameter has no runtime form to check against; see the note above
    return value as T;
}

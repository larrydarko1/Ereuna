import { getDefined } from '@/lib/lightweight-charts/helpers/assertions';
export type BoundComparatorType<TArrayElementType, TValueType> = (a: TArrayElementType, b: TValueType) => boolean;

/**
 * Binary function that accepts two arguments (the first of the type of array elements, and the second is always val), and returns a value convertible to bool.
 * The value returned indicates whether the first argument is considered to go before the second.
 * The function shall not modify any of its arguments.
 */

/**
 * Walks a sorted range, halving it each step, and returns the index the search
 * settled on. `goRight` decides which half to keep: it is what separates a
 * lower bound from an upper one.
 */
function binarySearch<TArrayElementType>(
    arr: readonly TArrayElementType[],
    start: number,
    to: number,
    goRight: (element: TArrayElementType) => boolean,
): number {
    let count: number = to - start;
    while (0 < count) {
        const half: number = count >> 1;
        const mid: number = start + half;
        if (goRight(getDefined(arr[mid]))) {
            start = mid + 1;
            count -= half + 1;
        } else {
            count = half;
        }
    }

    return start;
}

/** The first index whose element does not compare before `value`. */
export function lowerBound<TArrayElementType, TValueType>(
    arr: readonly TArrayElementType[],
    value: TValueType,
    compare: BoundComparatorType<TArrayElementType, TValueType>,
): number {
    return binarySearch(arr, 0, arr.length, (element: TArrayElementType) => compare(element, value));
}

/** The first index whose element compares after `value`. */
export function upperBound<TArrayElementType, TValueType>(
    arr: readonly TArrayElementType[],
    value: TValueType,
    compare: BoundComparatorType<TArrayElementType, TValueType>,
): number {
    return binarySearch(arr, 0, arr.length, (element: TArrayElementType) => !compare(element, value));
}

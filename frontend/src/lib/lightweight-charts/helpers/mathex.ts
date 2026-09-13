/**
 * Numeric helpers the model needs, and the ones with a non-obvious rule:
 * `equal` and `greaterOrEqual` compare within a chosen epsilon rather than exactly,
 * because the values being compared are prices that came out of a division.
 */
import { getDefined } from '@/lib/lightweight-charts/helpers/assertions';

export function clamp(value: number, minVal: number, maxVal: number): number {
    return Math.min(Math.max(value, minVal), maxVal);
}

export function isBaseDecimal(value: number): boolean {
    if (value < 0) {
        return false;
    }

    for (let current = value; current > 1; current /= 10) {
        if (current % 10 !== 0) {
            return false;
        }
    }

    return true;
}

export function greaterOrEqual(x1: number, x2: number, epsilon: number): boolean {
    return x2 - x1 <= epsilon;
}

export function equal(x1: number, x2: number, epsilon: number): boolean {
    return Math.abs(x1 - x2) < epsilon;
}

// We can't use Math.min(...arr) because that would only support arrays shorter than 65536 items.
export function min(arr: number[]): number {
    if (arr.length < 1) {
        throw Error('array is empty');
    }

    let minVal = getDefined(arr[0]);
    for (const value of arr) {
        if (value < minVal) {
            minVal = value;
        }
    }

    return minVal;
}

export function ceiledEven(x: number): number {
    const ceiled = Math.ceil(x);
    return ceiled % 2 !== 0 ? ceiled - 1 : ceiled;
}

export function ceiledOdd(x: number): number {
    const ceiled = Math.ceil(x);
    return ceiled % 2 === 0 ? ceiled - 1 : ceiled;
}

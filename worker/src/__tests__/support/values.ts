/**
 * Reading what a test captured as `unknown` — a response body, a recorded
 * write, a pipeline stage — without casting it to the shape the test expects.
 */
import { isList, isRecord } from '@ereuna/shared';

/**
 * The value at `path`, walking records by key and lists by index. A step that
 * is not there fails the test by naming the path, where a cast would read
 * `undefined` and compare that.
 */
export function at(value: unknown, ...path: (string | number)[]): unknown {
    let cursor = value;
    for (const [depth, key] of path.entries()) {
        if (typeof key === 'number' && isList(cursor) && key < cursor.length) cursor = cursor[key];
        else if (typeof key === 'string' && isRecord(cursor) && key in cursor) cursor = cursor[key];
        else throw new Error(`nothing at ${path.slice(0, depth + 1).join('.')}`);
    }
    return cursor;
}

/** The record at `path`, checked to be one. */
export function recordAt(value: unknown, ...path: (string | number)[]): Record<string, unknown> {
    const found = at(value, ...path);
    if (!isRecord(found)) throw new Error(`expected an object at ${path.join('.')}`);
    return found;
}

/** The list at `path`, checked to be one. */
export function listAt(value: unknown, ...path: (string | number)[]): unknown[] {
    const found = at(value, ...path);
    if (!isList(found)) throw new Error(`expected a list at ${path.join('.')}`);
    return found;
}

/** The date at `path`, checked to be one. */
export function dateAt(value: unknown, ...path: (string | number)[]): Date {
    const found = at(value, ...path);
    if (!(found instanceof Date)) throw new Error(`expected a Date at ${path.join('.')}`);
    return found;
}

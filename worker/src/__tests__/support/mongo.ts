/**
 * A Mongo double for the nightly jobs.
 * It does NOT re-implement query matching, on purpose: a mini query engine
 * would be the thing under test rather than the job, and a job whose filter is
 * wrong would still pass against a fake that interpreted it the same wrong way.
 * So a collection answers reads with exactly what it was seeded with, and
 * records every filter and every write for the test to assert on directly.
 */
import { vi, type Mock } from 'vitest';

type WriteRecord = {
    method: string;
    args: unknown[];
};

export type CollectionStub = {
    name: string;
    seed: unknown[];
    /**
     * What a write resolves with, by method name. Set one to steer a job that
     * branches on the driver's answer — `modifiedCount`, say. Overriding the
     * mock itself with `mockResolvedValue` would work too, and would silently
     * stop the call being recorded in `writes`.
     */
    results: Record<string, unknown>;
    /** Every read filter this collection was asked for, oldest first. */
    filters: unknown[];
    /** Every write this collection received, oldest first. */
    writes: WriteRecord[];
    find: Mock;
    findOne: Mock;
    aggregate: Mock;
    updateOne: Mock;
    updateMany: Mock;
    insertMany: Mock;
    deleteMany: Mock;
    bulkWrite: Mock;
    createIndex: Mock;
    countDocuments: Mock;
    distinct: Mock;
};

export type DbStub = {
    collection: Mock;
    /** The stub for `name`, created on first use so a test can assert on an untouched one. */
    of: (name: string) => CollectionStub;
    /** Every write across every collection, in the order the job made them. */
    writes: () => (WriteRecord & { collection: string })[];
};

function cursor(rows: unknown[]): Record<string, unknown> {
    const self: Record<string, unknown> = {
        toArray: () => Promise.resolve(rows),
        sort: () => self,
        limit: () => self,
        skip: () => self,
        project: () => self,
        map: (fn: (row: unknown) => unknown) => cursor(rows.map(fn)),
        [Symbol.asyncIterator]: async function* () {
            for (const row of rows) yield row;
        },
    };
    return self;
}

export function fakeDb(seed: Record<string, unknown[]> = {}): DbStub {
    const order: (WriteRecord & { collection: string })[] = [];
    const stubs = new Map<string, CollectionStub>();

    const build = (name: string): CollectionStub => {
        const rows = seed[name] ?? [];
        const filters: unknown[] = [];
        const writes: WriteRecord[] = [];
        const results: Record<string, unknown> = {};

        const record =
            (method: string, fallback: unknown) =>
            (...args: unknown[]): Promise<unknown> => {
                const entry = { method, args };
                writes.push(entry);
                order.push({ ...entry, collection: name });
                return Promise.resolve(results[method] ?? fallback);
            };

        return {
            name,
            seed: rows,
            results,
            filters,
            writes,
            find: vi.fn((filter?: unknown) => {
                filters.push(filter);
                return cursor(rows);
            }),
            findOne: vi.fn((filter?: unknown) => {
                filters.push(filter);
                return Promise.resolve(rows[0] ?? null);
            }),
            aggregate: vi.fn((pipeline?: unknown) => {
                filters.push(pipeline);
                return cursor(rows);
            }),
            countDocuments: vi.fn((filter?: unknown) => {
                filters.push(filter);
                return Promise.resolve(rows.length);
            }),
            distinct: vi.fn((field?: unknown) => {
                filters.push(field);
                return Promise.resolve(rows);
            }),
            updateOne: vi.fn(
                record('updateOne', { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }),
            ),
            updateMany: vi.fn(
                record('updateMany', { acknowledged: true, matchedCount: rows.length, modifiedCount: rows.length }),
            ),
            insertMany: vi.fn(record('insertMany', { acknowledged: true, insertedCount: 0 })),
            deleteMany: vi.fn(record('deleteMany', { acknowledged: true, deletedCount: 0 })),
            bulkWrite: vi.fn(record('bulkWrite', { ok: 1, nMatched: 0, nModified: 0, nUpserted: 0 })),
            createIndex: vi.fn(record('createIndex', 'idx')),
        };
    };

    const of = (name: string): CollectionStub => {
        const existing = stubs.get(name);
        if (existing !== undefined) return existing;
        const built = build(name);
        stubs.set(name, built);
        return built;
    };

    return { collection: vi.fn((name: string) => of(name)), of, writes: () => order };
}

/** The `$set` payload of the nth updateOne on a collection. */
export function setPayload<T = Record<string, unknown>>(collection: CollectionStub, index = 0): T {
    const write = collection.writes.filter((w) => w.method === 'updateOne')[index];
    return (write?.args[1] as { $set: T }).$set;
}

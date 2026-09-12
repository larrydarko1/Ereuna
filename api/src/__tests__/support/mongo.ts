/**
 * A Mongo double for the API's services.
 * It answers reads with what it was seeded and records every filter, update and
 * option — it does NOT re-implement query matching, because a fake that
 * interpreted a filter would agree with a wrong one exactly as readily as with
 * a right one, which is the thing these tests exist to catch.
 */
import { ObjectId } from 'mongodb';
import { vi, type Mock } from 'vitest';

/** Every driver method this double answers for; `results` is keyed by it. */
type StubMethod =
    | 'find'
    | 'findOne'
    | 'findOneAndUpdate'
    | 'aggregate'
    | 'countDocuments'
    | 'distinct'
    | 'insertOne'
    | 'insertMany'
    | 'updateOne'
    | 'updateMany'
    | 'replaceOne'
    | 'deleteOne'
    | 'deleteMany'
    | 'bulkWrite'
    | 'createIndex';

type WriteRecord = { method: StubMethod; args: unknown[] };

type CollectionStub = {
    name: string;
    seed: unknown[];
    results: Partial<Record<StubMethod, unknown>>;
    filters: unknown[];
    writes: WriteRecord[];
    find: Mock;
    findOne: Mock;
    findOneAndUpdate: Mock;
    aggregate: Mock;
    countDocuments: Mock;
    distinct: Mock;
    insertOne: Mock;
    insertMany: Mock;
    updateOne: Mock;
    updateMany: Mock;
    replaceOne: Mock;
    deleteOne: Mock;
    deleteMany: Mock;
    bulkWrite: Mock;
    createIndex: Mock;
};

export type DbStub = {
    collection: Mock;
    command: Mock;
    of: (name: string) => CollectionStub;
};

function cursor(rows: unknown[]): Record<string, unknown> {
    const self: Record<string, unknown> = {
        toArray: () => Promise.resolve(rows),
        sort: () => self,
        limit: () => self,
        skip: () => self,
        project: () => self,
        [Symbol.asyncIterator]: async function* () {
            for (const row of rows) yield row;
        },
    };
    return self;
}

export function fakeDb(seed: Record<string, unknown[]> = {}): DbStub {
    const stubs = new Map<string, CollectionStub>();

    const build = (name: string): CollectionStub => {
        const rows = seed[name] ?? [];
        const filters: unknown[] = [];
        const writes: WriteRecord[] = [];
        const results: Partial<Record<StubMethod, unknown>> = {};

        const reader =
            (method: StubMethod, answer: (filter?: unknown) => unknown) =>
            (filter?: unknown, ..._rest: unknown[]): unknown => {
                filters.push(filter);
                return results[method] === undefined ? answer(filter) : results[method];
            };

        const writer =
            (method: StubMethod, fallback: unknown) =>
            (...args: unknown[]): Promise<unknown> => {
                writes.push({ method, args });
                return Promise.resolve(results[method] ?? fallback);
            };

        const acknowledged = {
            acknowledged: true,
            matchedCount: 1,
            modifiedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        };

        return {
            name,
            seed: rows,
            results,
            filters,
            writes,
            find: vi.fn(reader('find', () => cursor(rows))),
            findOne: vi.fn(reader('findOne', () => Promise.resolve(rows[0] ?? null))),
            aggregate: vi.fn(reader('aggregate', () => cursor(rows))),
            countDocuments: vi.fn(reader('countDocuments', () => Promise.resolve(rows.length))),
            distinct: vi.fn(reader('distinct', () => Promise.resolve(rows))),
            findOneAndUpdate: vi.fn((...args: unknown[]) => {
                writes.push({ method: 'findOneAndUpdate', args });
                // `in` rather than `??`: a test setting the result to null is
                // saying "no document matched", which `??` would fall through.
                const answer = 'findOneAndUpdate' in results ? results.findOneAndUpdate : (rows[0] ?? null);
                return Promise.resolve(answer);
            }),
            // A real id rather than null: callers project the inserted document
            // straight back to the client, and `null.toHexString()` is not the
            // failure any of them are being tested for.
            insertOne: vi.fn(writer('insertOne', { acknowledged: true, insertedId: new ObjectId() })),
            insertMany: vi.fn(writer('insertMany', { acknowledged: true, insertedCount: 0 })),
            updateOne: vi.fn(writer('updateOne', acknowledged)),
            updateMany: vi.fn(writer('updateMany', acknowledged)),
            replaceOne: vi.fn(writer('replaceOne', acknowledged)),
            deleteOne: vi.fn(writer('deleteOne', { acknowledged: true, deletedCount: 1 })),
            deleteMany: vi.fn(writer('deleteMany', { acknowledged: true, deletedCount: 1 })),
            bulkWrite: vi.fn(writer('bulkWrite', { ok: 1 })),
            createIndex: vi.fn(writer('createIndex', 'idx')),
        };
    };

    const of = (name: string): CollectionStub => {
        const existing = stubs.get(name);
        if (existing !== undefined) return existing;
        const built = build(name);
        stubs.set(name, built);
        return built;
    };

    return { collection: vi.fn((name: string) => of(name)), command: vi.fn(() => Promise.resolve({ ok: 1 })), of };
}

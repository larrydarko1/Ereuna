/**
 * A Mongo double for the ingestor's two reads.
 * It answers with what it was seeded and records the filter, rather than
 * interpreting the query — a fake that re-implemented matching would agree with
 * a wrong filter just as readily as with a right one.
 */
import { vi, type Mock } from 'vitest';

type CollectionStub = {
    filters: unknown[];
    find: Mock;
    findOne: Mock;
};

export type DbStub = {
    collection: Mock;
    of: (name: string) => CollectionStub;
};

export function fakeDb(seed: Record<string, unknown[]> = {}): DbStub {
    const stubs = new Map<string, CollectionStub>();

    const of = (name: string): CollectionStub => {
        const existing = stubs.get(name);
        if (existing !== undefined) return existing;

        const rows = seed[name] ?? [];
        const filters: unknown[] = [];
        const built: CollectionStub = {
            filters,
            find: vi.fn((filter?: unknown) => {
                filters.push(filter);
                return { toArray: () => Promise.resolve(rows) };
            }),
            findOne: vi.fn((filter?: unknown) => {
                filters.push(filter);
                return Promise.resolve(rows[0] ?? null);
            }),
        };

        stubs.set(name, built);
        return built;
    };

    return { collection: vi.fn((name: string) => of(name)), of };
}

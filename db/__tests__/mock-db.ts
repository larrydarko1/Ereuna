/**
 * In-memory stand-in for the MongoDB `Db` a migration receives.
 * Migrations are handed a raw driver handle by migrate-mongo, so there is no
 * seam to inject at — this simulates only the surface the migrations in this
 * directory actually touch, and records what they did so a test can assert it.
 * It mirrors the driver's real answers, including the surprising ones: `drop()`
 * on a collection that is not there RESOLVES, and `dropIndex()` on an index
 * that is not there RESOLVES too. A mock that threw instead would let a
 * migration claim work it never did, and pass.
 * `updateMany` applies the two operators the migrations here use, `$rename` and
 * `$unset`, and counts a document as modified only when one of them changed it.
 * `aggregate` recognises one pipeline — the group-and-count the dedupe issues.
 * Anything else throws rather than returning an empty result, so a migration
 * that grows a second pipeline fails here instead of passing on a silent [].
 */
import { vi } from 'vitest';

type Doc = Record<string, unknown>;
type CreatedIndex = { spec: unknown; options?: unknown };
type Update = { $rename?: Record<string, string>; $unset?: Record<string, unknown> };

const documents = new Map<string, Doc[]>();
const indexes = new Map<string, string[]>();
const createdIndexes = new Map<string, CreatedIndex[]>();
const dropped: string[] = [];
const droppedIndexes: string[] = [];

function docsOf(name: string): Doc[] {
    if (!documents.has(name)) documents.set(name, []);
    return documents.get(name)!;
}

function indexesOf(name: string): string[] {
    if (!indexes.has(name)) indexes.set(name, []);
    return indexes.get(name)!;
}

function createdOf(name: string): CreatedIndex[] {
    if (!createdIndexes.has(name)) createdIndexes.set(name, []);
    return createdIndexes.get(name)!;
}

/** A driver error carries `codeName`, and the migrations branch on it. */
function mongoError(codeName: string, code: number): Error & { codeName: string; code: number } {
    return Object.assign(new Error(codeName), { codeName, code });
}

export const mockDb = {
    collection: vi.fn((name: string) => ({
        createIndex: vi.fn(async (spec: unknown, options?: unknown) => {
            createdOf(name).push({ spec, options });
            return 'ok';
        }),
        indexes: vi.fn(async () => indexesOf(name).map((index) => ({ name: index }))),
        drop: vi.fn(async () => {
            documents.delete(name);
            dropped.push(name);
            return true;
        }),
        dropIndex: vi.fn(async (index: string) => {
            const existing = indexesOf(name);
            const at = existing.indexOf(index);
            if (at !== -1) existing.splice(at, 1);
            droppedIndexes.push(`${name}.${index}`);
            return { ok: 1 };
        }),
        deleteMany: vi.fn(async (filter: Doc) => {
            const remaining: Doc[] = [];
            let deletedCount = 0;

            for (const doc of docsOf(name)) {
                if (matches(doc, filter)) deletedCount++;
                else remaining.push(doc);
            }

            documents.set(name, remaining);
            return { deletedCount };
        }),
        updateMany: vi.fn(async (filter: Doc, update: Update) => {
            let modifiedCount = 0;

            for (const doc of docsOf(name)) {
                if (!matches(doc, filter)) continue;
                let changed = false;

                for (const [from, to] of Object.entries(update.$rename ?? {})) {
                    if (!(from in doc)) continue;
                    doc[to] = doc[from];
                    delete doc[from];
                    changed = true;
                }

                for (const field of Object.keys(update.$unset ?? {})) {
                    if (!(field in doc)) continue;
                    delete doc[field];
                    changed = true;
                }

                if (changed) modifiedCount++;
            }

            return { modifiedCount };
        }),
        find: vi.fn((filter: Doc) => ({
            toArray: async () => docsOf(name).filter((doc) => matches(doc, filter)),
        })),
        aggregate: vi.fn((pipeline: unknown[]) => ({
            toArray: async () => groupDuplicates(docsOf(name), pipeline),
        })),
    })),

    listCollections: vi.fn(() => ({
        toArray: async () => [...documents.keys()].map((name) => ({ name })),
    })),

    createCollection: vi.fn(async (name: string) => {
        if (documents.has(name)) throw mongoError('NamespaceExists', 48);
        docsOf(name);
        return {};
    }),
};

export function resetAll(): void {
    documents.clear();
    indexes.clear();
    createdIndexes.clear();
    dropped.length = 0;
    droppedIndexes.length = 0;
}

export function seedCollection(name: string, docs: Doc[]): void {
    documents.set(name, [...docs]);
}

export function seedIndexes(name: string, names: string[]): void {
    docsOf(name);
    indexes.set(name, [...names]);
}

export function getDocuments(name: string): Doc[] | undefined {
    return documents.get(name);
}

export function getIndexNames(name: string): string[] {
    return indexesOf(name);
}

export function getCreatedIndexes(name: string): CreatedIndex[] {
    return createdOf(name);
}

export function getDroppedCollections(): string[] {
    return [...dropped];
}

/** Every dropIndex call, whether or not the index was there — the point of the test. */
export function getDroppedIndexCalls(): string[] {
    return [...droppedIndexes];
}

/** The filter shapes these migrations use: `$exists`, `$in`, `$or`, and equality. */
function matches(doc: Doc, filter: Doc): boolean {
    return Object.entries(filter).every(([field, condition]) => {
        if (field === '$or') return Array.isArray(condition) && condition.filter(isRecord).some((clause) => matches(doc, clause));
        if (!isRecord(condition)) return doc[field] === condition;
        if ('$exists' in condition) return field in doc === condition['$exists'];
        if (Array.isArray(condition['$in'])) return condition['$in'].includes(doc[field]);
        return doc[field] === condition;
    });
}

function isRecord(value: unknown): value is Doc {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The one aggregation the dedupe issues: group by a field, collect the `_id`s,
 * keep the groups holding more than one.
 */
function groupDuplicates(docs: Doc[], pipeline: unknown[]): { _id: unknown; ids: unknown[] }[] {
    const [first] = pipeline;
    const group = isRecord(first) ? first['$group'] : undefined;
    const path = isRecord(group) ? group['_id'] : undefined;
    if (typeof path !== 'string' || !path.startsWith('$')) {
        throw new Error(`mock-db: unsupported aggregation ${JSON.stringify(pipeline)}`);
    }

    const field = path.slice(1);
    const groups = new Map<unknown, unknown[]>();
    for (const doc of docs) {
        const key = doc[field];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(doc._id);
    }

    return [...groups.entries()].filter(([, ids]) => ids.length > 1).map(([_id, ids]) => ({ _id, ids }));
}

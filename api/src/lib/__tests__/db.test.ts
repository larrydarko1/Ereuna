import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INDEXES } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const state: { connectError: Error | null; closed: number; lastUri: string | null; db: DbStub } = {
    connectError: null,
    closed: 0,
    lastUri: null,
    db: fakeDb(),
};

// Partial: the Mongo double this suite seeds the client with mints real
// ObjectIds, so replacing the whole module would take that export away with it.
vi.mock('mongodb', async (importOriginal) => ({
    ...(await importOriginal<typeof import('mongodb')>()),
    MongoClient: class {
        constructor(readonly uri: string) {
            state.lastUri = uri;
        }
        connect(): Promise<void> {
            return state.connectError === null ? Promise.resolve() : Promise.reject(state.connectError);
        }
        db(): DbStub {
            return state.db;
        }
        close(): Promise<void> {
            state.closed += 1;
            return Promise.resolve();
        }
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

const { config } = await import('@/lib/config.js');

/** The connection is module state, so each test gets an unopened module. */
let db: typeof import('@/lib/db.js');

beforeEach(async () => {
    state.connectError = null;
    state.closed = 0;
    state.lastUri = null;
    state.db = fakeDb();
    vi.resetModules();
    db = await import('@/lib/db.js');
});

describe('getDb', () => {
    it('refuses to hand out a database before the connection is open', () => {
        expect(() => db.getDb()).toThrow('DB not initialised');
    });

    it('hands back the connected database', async () => {
        await db.connectDb();
        expect(db.getDb()).toBe(state.db);
    });
});

describe('connectDb', () => {
    it('opens the configured uri', async () => {
        await db.connectDb();
        expect(state.lastUri).toBe(config.mongo.uri);
    });

    it('applies every index in the manifest before it resolves', async () => {
        await db.connectDb();
        const applied = INDEXES.map((spec) => spec.collection);
        for (const collection of new Set(applied)) {
            expect(state.db.of(collection).createIndex).toHaveBeenCalled();
        }
    });

    it('passes an empty options object for an index that declares none', async () => {
        await db.connectDb();
        const bare = INDEXES.find((spec) => spec.options === undefined);
        expect(bare).toBeDefined();
        expect(state.db.of(bare?.collection ?? '').createIndex).toHaveBeenCalledWith(expect.anything(), {});
    });

    it('rejects rather than binding a port with no database behind it', async () => {
        state.connectError = new Error('server selection timed out');
        await expect(db.connectDb()).rejects.toThrow('server selection timed out');
        expect(() => db.getDb()).toThrow('DB not initialised');
    });

    it('rejects when an index could not be built — the API applies its own manifest at boot', async () => {
        state.db = fakeDb();
        state.db.of(INDEXES[0]?.collection ?? '').createIndex.mockRejectedValueOnce(new Error('duplicate key'));
        await expect(db.connectDb()).rejects.toThrow('duplicate key');
    });
});

describe('closeDb', () => {
    it('closes an open client', async () => {
        await db.connectDb();
        await db.closeDb();
        expect(state.closed).toBe(1);
    });

    it('is a no-op when nothing was ever opened', async () => {
        await expect(db.closeDb()).resolves.toBeUndefined();
        expect(state.closed).toBe(0);
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state: { connectError: Error | null; connected: number; closed: number; lastUri: string | null } = {
    connectError: null,
    connected: 0,
    closed: 0,
    lastUri: null,
};

vi.mock('mongodb', () => ({
    MongoClient: class {
        constructor(readonly uri: string) {
            state.lastUri = uri;
        }
        connect(): Promise<void> {
            state.connected += 1;
            return state.connectError === null ? Promise.resolve() : Promise.reject(state.connectError);
        }
        db(name: string): { name: string } {
            return { name };
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
    state.connected = 0;
    state.closed = 0;
    state.lastUri = null;
    vi.resetModules();
    db = await import('@/lib/db.js');
});

describe('getDb', () => {
    it('refuses to hand out a database before the connection is open', () => {
        expect(() => db.getDb()).toThrow('DB not initialised');
    });

    it('hands back the database once connected', async () => {
        const connected = await db.connectDb();
        expect(db.getDb()).toBe(connected);
    });
});

describe('connectDb', () => {
    it('opens the configured uri and selects the configured database', async () => {
        await expect(db.connectDb()).resolves.toEqual({ name: config.mongo.db });
        expect(state.lastUri).toBe(config.mongo.uri);
    });

    it('rejects rather than starting half-connected — there would be nowhere to put a candle', async () => {
        state.connectError = new Error('server selection timed out');
        await expect(db.connectDb()).rejects.toThrow('server selection timed out');
        expect(() => db.getDb()).toThrow('DB not initialised');
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

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (err: Error) => void;

const built: { options: Record<string, unknown>; handlers: Map<string, Handler>; quit: () => Promise<string> }[] = [];
const logged: { errors: unknown[] } = { errors: [] };
const state: { quitError: Error | null } = { quitError: null };

vi.mock('ioredis', () => ({
    Redis: class {
        readonly handlers = new Map<string, Handler>();

        constructor(readonly options: Record<string, unknown>) {
            built.push(this);
        }

        on(event: string, handler: Handler): this {
            this.handlers.set(event, handler);
            return this;
        }

        quit(): Promise<string> {
            return state.quitError === null ? Promise.resolve('OK') : Promise.reject(state.quitError);
        }
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const { config } = await import('@/lib/config.js');

/** The two clients are module state, so each test gets a module with none open. */
let redis: typeof import('@/lib/redis.js');

beforeEach(async () => {
    built.length = 0;
    logged.errors = [];
    state.quitError = null;
    vi.resetModules();
    redis = await import('@/lib/redis.js');
});

describe('the two connections', () => {
    it('gives the consumer and the publisher separate sockets — a blocked read cannot publish', () => {
        expect(redis.getConsumer()).not.toBe(redis.getPublisher());
        expect(built).toHaveLength(2);
    });

    it('reuses each one rather than opening a socket per call', () => {
        expect(redis.getConsumer()).toBe(redis.getConsumer());
        expect(built).toHaveLength(1);
    });

    it('opens nothing until one is asked for', () => {
        expect(built).toEqual([]);
    });

    it('points both at the configured host and port', () => {
        redis.getConsumer();
        expect(built[0]?.options).toMatchObject({ host: config.redis.host, port: config.redis.port });
    });

    it('never gives up on a request — ioredis would abort a blocking read as a timeout', () => {
        redis.getConsumer();
        expect(built[0]?.options.maxRetriesPerRequest).toBeNull();
    });

    it('logs a client error rather than letting it reach the process', () => {
        redis.getConsumer();
        built[0]?.handlers.get('error')?.(new Error('ECONNRESET'));
        expect(logged.errors).toHaveLength(1);
    });
});

describe('closeRedis', () => {
    it('quits whatever is open and lets the next call reconnect', async () => {
        redis.getConsumer();
        redis.getPublisher();
        await redis.closeRedis();

        redis.getConsumer();
        expect(built).toHaveLength(3);
    });

    it('does nothing when nothing was opened', async () => {
        await expect(redis.closeRedis()).resolves.toBeUndefined();
    });

    it('settles even when a quit is rejected — shutdown must not hang on it', async () => {
        state.quitError = new Error('connection already gone');
        redis.getConsumer();
        await expect(redis.closeRedis()).resolves.toBeUndefined();
    });
});

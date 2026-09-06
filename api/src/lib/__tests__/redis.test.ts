import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (err: Error) => void;

const built: { options: Record<string, unknown>; handlers: Map<string, Handler> }[] = [];
const logged: { errors: unknown[] } = { errors: [] };

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
            return Promise.resolve('OK');
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

/** The client is module state, so each test gets a module with none open. */
let redis: typeof import('@/lib/redis.js');

beforeEach(async () => {
    built.length = 0;
    logged.errors = [];
    vi.resetModules();
    redis = await import('@/lib/redis.js');
});

describe('getRedis', () => {
    it('opens nothing until something asks for it', () => {
        expect(built).toEqual([]);
    });

    it('shares one client across the cache, the limiter and the throttle', () => {
        expect(redis.getRedis()).toBe(redis.getRedis());
        expect(built).toHaveLength(1);
    });

    it('points at the configured host and port, and connects lazily', () => {
        redis.getRedis();
        expect(built[0]?.options).toMatchObject({
            host: config.redis.host,
            port: config.redis.port,
            lazyConnect: true,
        });
    });

    it('gives up on a request after a few tries — every caller here fails open', () => {
        redis.getRedis();
        expect(built[0]?.options.maxRetriesPerRequest).toBe(3);
    });

    it('listens for errors, because an ioredis client without a listener takes the process down', () => {
        redis.getRedis();
        expect(built[0]?.handlers.has('error')).toBe(true);
        built[0]?.handlers.get('error')?.(new Error('ECONNRESET'));
        expect(logged.errors).toHaveLength(1);
    });
});

describe('closeRedis', () => {
    it('quits an open client and lets the next call reconnect', async () => {
        redis.getRedis();
        await redis.closeRedis();
        redis.getRedis();
        expect(built).toHaveLength(2);
    });

    it('does nothing when nothing was opened', async () => {
        await expect(redis.closeRedis()).resolves.toBeUndefined();
        expect(built).toEqual([]);
    });
});

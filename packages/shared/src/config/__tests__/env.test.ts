import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
    hexSecret,
    loggerEnv,
    metricsEnv,
    mongoEnv,
    nodeEnv,
    redisEnv,
    requiredSecret,
    tiingoEnv,
    toMongoConfig,
    toRedisConfig,
} from '#config/env.js';

const originalNodeEnv = process.env['NODE_ENV'];

afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
});

describe('the fragments', () => {
    it('defaults NODE_ENV to development and rejects anything outside the three', () => {
        const schema = z.object(nodeEnv);
        expect(schema.parse({}).NODE_ENV).toBe('development');
        expect(schema.safeParse({ NODE_ENV: 'staging' }).success).toBe(false);
    });

    it('defaults the log level to info', () => {
        expect(z.object(loggerEnv).parse({}).LOG_LEVEL).toBe('info');
    });

    it('gives mongo a working local default', () => {
        process.env['NODE_ENV'] = 'development';
        expect(z.object(mongoEnv).parse({})).toEqual({
            MONGO_URI: 'mongodb://localhost:27017',
            MONGO_DB: 'EreunaDB',
        });
    });

    it('coerces REDIS_PORT from the string every env var actually is', () => {
        const parsed = z.object(redisEnv).parse({ REDIS_PORT: '6380' });
        expect(parsed.REDIS_PORT).toBe(6380);
        expect(z.object(redisEnv).safeParse({ REDIS_PORT: '0' }).success).toBe(false);
    });

    it('defaults REDIS_DB to 0 and takes only the 16 databases a Redis server has', () => {
        expect(z.object(redisEnv).parse({}).REDIS_DB).toBe(0);
        expect(z.object(redisEnv).parse({ REDIS_DB: '1' }).REDIS_DB).toBe(1);
        expect(z.object(redisEnv).safeParse({ REDIS_DB: '16' }).success).toBe(false);
        expect(z.object(redisEnv).safeParse({ REDIS_DB: '-1' }).success).toBe(false);
    });

    it('leaves METRICS_TOKEN empty outside production, so a local scrape needs no setup', () => {
        process.env['NODE_ENV'] = 'development';
        expect(z.object(metricsEnv).parse({}).METRICS_TOKEN).toBe('');
    });

    it.each([
        ['missing', {}],
        ['empty', { METRICS_TOKEN: '' }],
        ['shorter than 32 characters', { METRICS_TOKEN: 'short-token' }],
    ])('refuses a METRICS_TOKEN that is %s in production', (_case, env) => {
        process.env['NODE_ENV'] = 'production';
        expect(z.object(metricsEnv).safeParse(env).success).toBe(false);
    });

    it('takes a 32-character METRICS_TOKEN in production', () => {
        process.env['NODE_ENV'] = 'production';
        const token = 'a'.repeat(32);
        expect(z.object(metricsEnv).parse({ METRICS_TOKEN: token }).METRICS_TOKEN).toBe(token);
    });

    it('gives TIINGO_KEY no default — both services need the real one', () => {
        expect(z.object(tiingoEnv).safeParse({}).success).toBe(false);
        expect(z.object(tiingoEnv).safeParse({ TIINGO_KEY: '' }).success).toBe(false);
    });
});

describe('the connection groups', () => {
    it('build the config.mongo and config.redis every service reads from what the fragments parsed', () => {
        const parsed = z.object({ ...mongoEnv, ...redisEnv }).parse({ MONGO_DB: 'EreunaSim', REDIS_DB: '1' });
        expect(toMongoConfig(parsed)).toEqual({ uri: 'mongodb://localhost:27017', db: 'EreunaSim' });
        expect(toRedisConfig(parsed)).toEqual({ host: 'localhost', port: 6379, db: 1 });
    });
});

describe('requiredSecret', () => {
    it('enforces the minimum length', () => {
        expect(requiredSecret(8).safeParse('short').success).toBe(false);
        expect(requiredSecret(8).safeParse('longenough').success).toBe(true);
    });

    it('accepts a dev placeholder outside production', () => {
        process.env['NODE_ENV'] = 'development';
        expect(requiredSecret(4).safeParse('dev_secret_value').success).toBe(true);
    });

    it.each(['dev_secret', 'dev-key', 'change-me', 'replace-me', 'replace-with-x', 'your-secret'])(
        'rejects `%s` in production',
        (placeholder) => {
            process.env['NODE_ENV'] = 'production';
            expect(requiredSecret(4).safeParse(`${placeholder}-padding`).success).toBe(false);
        },
    );

    it('matches a placeholder case-insensitively', () => {
        process.env['NODE_ENV'] = 'production';
        expect(requiredSecret(4).safeParse('DEV_SECRET_UPPERCASE').success).toBe(false);
    });

    it('accepts a real secret in production', () => {
        process.env['NODE_ENV'] = 'production';
        expect(requiredSecret(4).safeParse('a-genuinely-random-value').success).toBe(true);
    });
});

describe('hexSecret', () => {
    it('accepts exactly 2×bytes hex characters, either case', () => {
        expect(hexSecret(4).safeParse('0123abcd').success).toBe(true);
        expect(hexSecret(4).safeParse('0123ABCD').success).toBe(true);
    });

    it.each([
        ['too short', '0123abc'],
        ['too long', '0123abcd0'],
        ['a non-hex character', '0123abcg'],
        ['empty', ''],
    ])('rejects %s', (_label, value) => {
        expect(hexSecret(4).safeParse(value).success).toBe(false);
    });

    it('defaults to 32 bytes — 64 hex characters', () => {
        expect(hexSecret().safeParse('a'.repeat(64)).success).toBe(true);
        expect(hexSecret().safeParse('a'.repeat(63)).success).toBe(false);
    });
});

/**
 * The infra defaults, checked on the two variables that carry them rather than
 * on the helper: what matters is that MONGO_URI and REDIS_HOST are the ones
 * guarded, and a test of the helper alone stays green while a schema quietly
 * drops back to a plain `.default()`.
 */
describe('the infra defaults', () => {
    it('supplies a working local value when the variable is absent', () => {
        process.env['NODE_ENV'] = 'development';
        expect(z.object(mongoEnv).parse({}).MONGO_URI).toBe('mongodb://localhost:27017');
        expect(z.object(redisEnv).parse({}).REDIS_HOST).toBe('localhost');
    });

    it('rejects the untouched default in production, so a deploy cannot point at localhost', () => {
        process.env['NODE_ENV'] = 'production';
        expect(z.object(mongoEnv).safeParse({}).success).toBe(false);
        expect(z.object(mongoEnv).safeParse({ MONGO_URI: 'mongodb://localhost:27017' }).success).toBe(false);
        expect(z.object(redisEnv).safeParse({ REDIS_HOST: 'localhost' }).success).toBe(false);
    });

    it('accepts an overridden value in production', () => {
        process.env['NODE_ENV'] = 'production';
        expect(z.object(mongoEnv).safeParse({ MONGO_URI: 'mongodb://mongo.internal:27017' }).success).toBe(true);
        expect(z.object(redisEnv).safeParse({ REDIS_HOST: 'redis.internal' }).success).toBe(true);
    });

    it('rejects an empty override in every environment', () => {
        process.env['NODE_ENV'] = 'development';
        expect(z.object(mongoEnv).safeParse({ MONGO_URI: '' }).success).toBe(false);
        expect(z.object(redisEnv).safeParse({ REDIS_HOST: '' }).success).toBe(false);
    });
});

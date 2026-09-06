import { afterEach, describe, expect, it } from 'vitest';
import {
    hexSecret,
    infraDefault,
    loggerEnv,
    mongoEnv,
    nodeEnv,
    redisEnv,
    requiredSecret,
    tiingoEnv,
} from '#config/env.js';
import { z } from 'zod';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
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

    it('gives TIINGO_KEY no default — both services need the real one', () => {
        expect(z.object(tiingoEnv).safeParse({}).success).toBe(false);
        expect(z.object(tiingoEnv).safeParse({ TIINGO_KEY: '' }).success).toBe(false);
    });
});

describe('requiredSecret', () => {
    it('enforces the minimum length', () => {
        expect(requiredSecret(8).safeParse('short').success).toBe(false);
        expect(requiredSecret(8).safeParse('longenough').success).toBe(true);
    });

    it('accepts a dev placeholder outside production', () => {
        process.env.NODE_ENV = 'development';
        expect(requiredSecret(4).safeParse('dev_secret_value').success).toBe(true);
    });

    it.each(['dev_secret', 'dev-key', 'change-me', 'replace-me', 'replace-with-x', 'your-secret'])(
        'rejects `%s` in production',
        (placeholder) => {
            process.env.NODE_ENV = 'production';
            expect(requiredSecret(4).safeParse(`${placeholder}-padding`).success).toBe(false);
        },
    );

    it('matches a placeholder case-insensitively', () => {
        process.env.NODE_ENV = 'production';
        expect(requiredSecret(4).safeParse('DEV_SECRET_UPPERCASE').success).toBe(false);
    });

    it('accepts a real secret in production', () => {
        process.env.NODE_ENV = 'production';
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

describe('infraDefault', () => {
    it('supplies the default when the variable is absent', () => {
        process.env.NODE_ENV = 'development';
        expect(infraDefault('localhost').parse(undefined)).toBe('localhost');
    });

    it('rejects the untouched default in production', () => {
        process.env.NODE_ENV = 'production';
        expect(infraDefault('localhost').safeParse(undefined).success).toBe(false);
        expect(infraDefault('localhost').safeParse('localhost').success).toBe(false);
    });

    it('accepts an overridden value in production', () => {
        process.env.NODE_ENV = 'production';
        expect(infraDefault('localhost').safeParse('mongo.internal').success).toBe(true);
    });

    it('rejects an empty override in every environment', () => {
        process.env.NODE_ENV = 'development';
        expect(infraDefault('localhost').safeParse('').success).toBe(false);
    });
});

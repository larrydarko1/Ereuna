/**
 * Shared environment-variable schema fragments (Zod).
 * Each fragment is a plain object of validators, spread into a service's own
 * `z.object({...})`. Defining Mongo/Redis keys once here is what stops the api
 * and any future worker from drifting apart on the same variable.
 * The three helpers encode the fail-fast policy: `requiredSecret`/`hexSecret`
 * have no default at all, so a missing secret kills the process at startup in
 * every environment; `infraDefault` keeps a working local value but rejects it
 * in production, so a fresh clone runs with no `.env` while a misconfigured
 * deploy still dies at boot instead of quietly pointing at localhost.
 */
import { z } from 'zod';

/** Substrings that mark a value as an obvious dev placeholder (rejected in prod). */
const DEV_PLACEHOLDERS = ['dev_secret', 'dev-', 'change', 'replace-me', 'replace-with', 'your-'];

export const nodeEnv = {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
};

export const loggerEnv = {
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
};

export const mongoEnv = {
    MONGO_URI: z.string().min(1).default('mongodb://localhost:27017'),
    MONGO_DB: z.string().min(1).default('EreunaDB'),
};

export const redisEnv = {
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
};

/** A required secret: at least `min` chars, and in prod not a recognisable dev placeholder. */
export function requiredSecret(min = 32): z.ZodString {
    return z
        .string()
        .min(min, `must be at least ${min} characters`)
        .refine((v) => !isProd() || !DEV_PLACEHOLDERS.some((p) => v.toLowerCase().includes(p)), {
            message: 'must not be a dev placeholder in production',
        });
}

/** A required hex secret of exact byte length (AES/HMAC key). `bytes` → 2×bytes hex chars. */
export function hexSecret(bytes = 32): z.ZodString {
    const hexLen = bytes * 2;
    return z
        .string()
        .regex(new RegExp(`^[0-9a-fA-F]{${hexLen}}$`), `must be ${hexLen} hex characters (${bytes} bytes)`);
}

/**
 * An infra value with a working local default that MUST be overridden in prod.
 * Dev clones and runs with no .env; prod crashes loudly rather than quietly
 * authenticating with a placeholder credential.
 */
export function infraDefault(defaultValue: string): z.ZodDefault<z.ZodString> {
    return z
        .string()
        .min(1)
        .default(defaultValue)
        .refine((v) => !isProd() || v !== defaultValue, {
            message: `must be overridden in production (still the local default "${defaultValue}")`,
        });
}

const isProd = (): boolean => process.env.NODE_ENV === 'production';

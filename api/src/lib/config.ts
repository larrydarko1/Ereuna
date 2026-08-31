/**
 * Centralised application configuration.
 * Env vars are validated ONCE here with Zod — this module is the runtime type
 * boundary — then assembled into a typed `config` object. Import `config`
 * wherever a value is needed; never read `process.env` outside this file, and
 * never hardcode a limit in business logic.
 * Secrets (`JWT_SECRET`, `TOTP_ENCRYPTION_KEY`) have no default at all, so a
 * missing one kills the process at startup in every environment rather than
 * silently falling back. Infra endpoints keep a working localhost default for
 * dev convenience and are re-armed for production by the shared helpers.
 */
import argon2 from 'argon2';
import { z } from 'zod';
import { hexSecret, loggerEnv, mongoEnv, nodeEnv, redisEnv, requiredSecret } from '@ereuna/shared';

const Env = z
    .object({
        ...nodeEnv,
        ...loggerEnv,
        ...mongoEnv,
        ...redisEnv,

        PORT: z.coerce.number().int().positive().default(5500),
        CORS_ORIGIN: z.url().default('http://localhost:3500'),
        /** Trusted reverse-proxy hops for Express `trust proxy`. Never `true` — a
         *  client can otherwise spoof X-Forwarded-For and defeat every ip-keyed control. */
        TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),

        JWT_SECRET: requiredSecret(32),
        TOTP_ENCRYPTION_KEY: hexSecret(32), // AES-256-GCM key for TOTP secrets at rest.
        TOTP_ISSUER: z.string().min(1).default('Ereuna'),

        METRICS_TOKEN: z.string().optional(),
    });

const parsed = Env.parse(process.env);

export const config = {
    port: parsed.PORT,
    corsOrigin: parsed.CORS_ORIGIN,
    trustProxyHops: parsed.TRUST_PROXY_HOPS,
    isDev: parsed.NODE_ENV !== 'production',
    isTest: parsed.NODE_ENV === 'test',

    jwt: {
        secret: parsed.JWT_SECRET,
        accessTokenExpiry: '15m' as const,
        refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days 
        sessionTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
        twoFactorTempExpiry: '5m' as const, // Temp token lifetime for the 2FA login flow
    },

    argon2: {
        type: argon2.argon2id,
        memoryCost: 64 * 1024, // 64 MB
        timeCost: 3,
        parallelism: 4,
    } satisfies argon2.HashOptions,

    totp: {
        issuer: parsed.TOTP_ISSUER,
        encryptionKey: parsed.TOTP_ENCRYPTION_KEY,
        window: 1,
        recoveryCodeCount: 10,
    },

    limits: {
        screenersPerUser: 20,
        watchlistsPerUser: 30,
        tickersPerWatchlist: 500,
        notesPerSymbol: 200,
        portfolioSlots: 10,
        benchmarksPerPortfolio: 5,
        importRows: 5000,
    },

    /** Cache TTLs in seconds. Price data is re-fetched far more often while the
     *  US market is open; everything else is stable enough to hold longer. */
    cache: {
        priceMarketOpen: 60,
        priceMarketClosed: 300,
        staticData: 30 * 60,
        userData: 15 * 60,
    },


    mongo: {
        uri: parsed.MONGO_URI,
        db: parsed.MONGO_DB,
    },

    redis: {
        host: parsed.REDIS_HOST,
        port: parsed.REDIS_PORT,
        url: parsed.REDIS_URL,
    },

    logger: {
        level: parsed.LOG_LEVEL,
    },

    metricsToken: parsed.METRICS_TOKEN,
} as const;

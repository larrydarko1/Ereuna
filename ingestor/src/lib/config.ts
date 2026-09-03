/**
 * Ingestor configuration.
 * Env vars are validated ONCE here with Zod — this module is the runtime type
 * boundary — then assembled into a typed `config`. Nothing else in the service
 * reads `process.env`.
 * `TIINGO_KEY` has no default, so a missing key kills the process at startup
 * rather than producing a service that connects and subscribes to nothing.
 */
import { z } from 'zod';
import { loggerEnv, mongoEnv, nodeEnv, redisEnv, tiingoEnv } from '@ereuna/shared';

const Env = z.object({
    ...nodeEnv,
    ...loggerEnv,
    ...mongoEnv,
    ...redisEnv,
    ...tiingoEnv,

    PROBE_PORT: z.coerce.number().int().positive().default(9092),
    METRICS_TOKEN: z.string().optional(),
});

const parsed = Env.parse(process.env);

export const config = {
    isDev: parsed.NODE_ENV !== 'production',

    mongo: {
        uri: parsed.MONGO_URI,
        db: parsed.MONGO_DB,
    },

    redis: {
        host: parsed.REDIS_HOST,
        port: parsed.REDIS_PORT,
    },

    // https://www.tiingo.com/documentation/iex
    tiingo: {
        key: parsed.TIINGO_KEY,
        url: 'wss://api.tiingo.com/iex',
        thresholdLevel: 6,
        handshakeTimeoutMs: 10_000, // How long to wait for the subscribe acknowledgement before giving up
    },

    logger: {
        level: parsed.LOG_LEVEL,
    },

    probe: {
        port: parsed.PROBE_PORT,
        token: parsed.METRICS_TOKEN,
    },

    pollIntervalMs: 10_000, // How often the market-hours loop re-checks whether a session has begun
} as const;

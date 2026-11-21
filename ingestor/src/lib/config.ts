/**
 * Ingestor configuration.
 * Env vars are validated ONCE here with Zod — this module is the runtime type
 * boundary — then assembled into a typed `config`. Nothing else in the service
 * reads `process.env`.
 * `TIINGO_KEY` has no default, so a missing key kills the process at startup
 * rather than producing a service that connects and subscribes to nothing.
 * `TIINGO_URL` exists for the local feed simulator. Production refuses anything
 * but a secure socket, so a dev value left in a deployment's env stops the
 * ingestor at boot instead of feeding the candles simulated trades.
 */
import { z } from 'zod';

import { loggerEnv, mongoEnv, nodeEnv, redisEnv, tiingoEnv, toMongoConfig, toRedisConfig } from '@ereuna/shared';

const Env = z
    .object({
        ...nodeEnv,
        ...loggerEnv,
        ...mongoEnv,
        ...redisEnv,
        ...tiingoEnv,
        // Blank counts as unset, because an .env copied from the example carries the key empty
        TIINGO_URL: z
            .string()
            .default('')
            .transform((value) => (value === '' ? TIINGO_FEED : value))
            .pipe(z.url({ protocol: /^wss?$/ })),

        PROBE_PORT: z.coerce.number().int().positive().default(9092),
        METRICS_TOKEN: z.string().optional(),
    })
    .refine((env) => env.NODE_ENV !== 'production' || env.TIINGO_URL.startsWith('wss://'), {
        path: ['TIINGO_URL'],
        message: 'must be a wss:// address in production',
    });

// https://www.tiingo.com/documentation/websockets/equity-realtime-stock-data
const TIINGO_FEED = 'wss://api.tiingo.com/equity/intraday';

const parsed = Env.parse(process.env);

export const config = {
    isDev: parsed.NODE_ENV !== 'production',

    mongo: toMongoConfig(parsed),
    redis: toRedisConfig(parsed),

    tiingo: {
        key: parsed.TIINGO_KEY,
        url: parsed.TIINGO_URL,
        thresholdLevel: 6,
        handshakeTimeoutMs: 10_000, // How long to wait for the subscribe acknowledgement before giving up
        unsubscribeTimeoutMs: 5_000, // How long to wait for the vendor's answer to the unsubscribe before closing anyway
    },

    logger: {
        level: parsed.LOG_LEVEL,
        file: parsed.LOG_FILE,
    },

    probe: {
        port: parsed.PROBE_PORT,
        token: parsed.METRICS_TOKEN,
    },

    pollIntervalMs: 10_000, // How often the market-hours loop re-checks whether a session has begun
    shutdownTimeoutMs: 15_000, // How long a shutdown waits for the session to unsubscribe and close before exiting anyway
} as const;

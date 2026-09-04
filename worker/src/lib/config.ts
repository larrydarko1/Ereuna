/**
 * Worker configuration.
 * Env vars are validated ONCE here with Zod — this module is the runtime type
 * boundary — then assembled into a typed `config`. Nothing else in the service
 * reads `process.env`.
 */
import { z } from 'zod';
import { loggerEnv, mongoEnv, nodeEnv, redisEnv } from '@ereuna/shared';

const WORKER_ROLES = ['all', 'aggregate', 'organize'] as const;

const Env = z
    .object({
        ...nodeEnv,
        ...loggerEnv,
        ...mongoEnv,
        ...redisEnv,

            WORKER_ROLE: z.enum(WORKER_ROLES).default('all'),

        TIINGO_KEY: z.string().default(''),

        PROBE_PORT: z.coerce.number().int().positive().default(9093),
        METRICS_TOKEN: z.string().optional(),

        // Run the nightly batch once at startup instead of waiting for the
        // clock. For a manual catch-up after an outage; never set in a deployment
        ORGANIZE_ON_START: z
            .enum(['true', 'false'])
            .default('false')
            .transform((value) => value === 'true'),
    })
    // superRefine rather than refine: the key is required for two of the three
    // roles and absent for the third, so it cannot be declared required in the
    // schema, and a defaulted secret is otherwise exempt from fail-fast forever
    .superRefine((env, ctx) => {
        if (env.WORKER_ROLE !== 'aggregate' && env.TIINGO_KEY === '') {
            ctx.addIssue({
                code: 'custom',
                path: ['TIINGO_KEY'],
                message: 'TIINGO_KEY is required unless WORKER_ROLE is "aggregate": the nightly run has nothing to fetch without it',
            });
        }
    });

const parsed = Env.parse(process.env);

export const config = {
    isDev: parsed.NODE_ENV !== 'production',

    role: parsed.WORKER_ROLE,

    mongo: {
        uri: parsed.MONGO_URI,
        db: parsed.MONGO_DB,
    },

    redis: {
        host: parsed.REDIS_HOST,
        port: parsed.REDIS_PORT,
    },

    tiingo: {
        key: parsed.TIINGO_KEY,
        baseUrl: 'https://api.tiingo.com',
        timeoutMs: 30_000,
        retries: 3, // Total attempts per request, with exponential back-off between them
        concurrency: 8, // Simultaneous vendor requests. The per-ticker endpoints are called ~10k times a night
    },

    stream: {
        batchSize: 500, // Trades read per XREADGROUP call. Large enough that the open bell is one round trip, not fifty
        blockMs: 5_000, // How long a read waits for new trades before returning empty, in ms
    },

    /**
     * How often the in-progress candle for a pair is republished, in ms.
     * A liquid symbol prints many times a second and every print moves the
     * same bar; without a floor the feed would be dominated by redundant
     * updates to a candle the client already has to within a cent.
     */
    candles: {
        publishThrottleMs: 500,
        sweepIntervalMs: 1_000, // How often closed buckets are swept, in ms
        flushIntervalMs: 500, // How often finished candles are written to Mongo, in ms
        writeBatchSize: 500, // Documents per bulk write. Beyond this the batch is split
    },

    organize: {
        runHourEt: 19, // Three hours after the 16:00 close, so late prints have settled
        runOnStart: parsed.ORGANIZE_ON_START,
        writeBatchSize: 500, // AssetInfo updates per bulk write
        intradayRetentionDays: 14, // How long a 1m/5m/15m/30m/1hr bar is kept
        delistAfterDays: 14, // No daily bar for this long and the symbol is treated as delisted
    },

    logger: {
        level: parsed.LOG_LEVEL,
    },

    probe: {
        port: parsed.PROBE_PORT,
        token: parsed.METRICS_TOKEN,
    },
} as const;

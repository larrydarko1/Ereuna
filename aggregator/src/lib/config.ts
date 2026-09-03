/**
 * Aggregator configuration.
 * Env vars are validated ONCE here with Zod — this module is the runtime type
 * boundary — then assembled into a typed `config`. Nothing else in the service
 * reads `process.env`.
 */
import { z } from 'zod';
import { loggerEnv, mongoEnv, nodeEnv, redisEnv } from '@ereuna/shared';

const Env = z.object({
    ...nodeEnv,
    ...loggerEnv,
    ...mongoEnv,
    ...redisEnv,

    PROBE_PORT: z.coerce.number().int().positive().default(9093),
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

    logger: {
        level: parsed.LOG_LEVEL,
    },

    probe: {
        port: parsed.PROBE_PORT,
        token: parsed.METRICS_TOKEN,
    },
} as const;

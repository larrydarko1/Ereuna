/**
 * Aggregator entry point.
 * One process between two Redis keys: it reads the ingestor's trade stream,
 * turns it into candles at seven timeframes, upserts each finished candle into
 * MongoDB, and publishes both the finished and the in-progress ones so the
 * API's socket gateway can push them to a browser.
 * It must run as a single instance. Buckets are held in memory, so two copies
 * would each build half a candle out of half the trades and then overwrite each
 * other's row — the consumer group would split the stream between them, which
 * is exactly what must not happen to a stateful aggregation.
 */
import 'dotenv/config';
import { type Server } from 'http';
import { OHLCV_INDEXES } from '@ereuna/shared';
import { startProbeServer } from '@ereuna/shared/service/probes';
import { config } from '@/lib/config.js';
import { closeDb, connectDb, getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { closeRedis } from '@/lib/redis.js';
import { startSession, stopSession } from '@/session.js';
import { consumeTrades } from '@/stream.js';
import { startWriter, stopWriter } from '@/writer.js';

let stopping = false;
let probes: Server | undefined;

/**
 * Create the candle indexes. Idempotent — `createIndex` is a no-op when one
 * with the same keys already exists — and owned here because the aggregator is
 * the only writer of these collections.
 */
async function ensureIndexes(): Promise<void> {
    const db = getDb();
    await Promise.all(OHLCV_INDEXES.map(({ collection, keys, options }) => db.collection(collection).createIndex(keys, options ?? {})));
    logger.info({ count: OHLCV_INDEXES.length }, 'Candle indexes ensured');
}

/**
 * Startup is all-or-nothing. Without Mongo there is nowhere to put a finished
 * candle, and a process that consumed the stream anyway would acknowledge
 * trades it then dropped — so a failure here kills it with a logged reason.
 */
connectDb()
    .then(ensureIndexes)
    .then(() => {
        probes = startProbeServer({
            port: config.probe.port,
            token: config.probe.token,
            onError: (err) => logger.error({ err }, 'Failed to render metrics'),
        });
        logger.info({ port: config.probe.port }, 'Probes listening');

        startWriter();
        return startSession();
    })
    .then(() => consumeTrades(() => stopping))
    .catch((err: Error) => {
        logger.fatal({ err }, 'Aggregator failed');
        process.exit(1);
    });

/**
 * Graceful shutdown. The buffered candles are written before the process ends —
 * they are the ones already finalised and not yet flushed, and dropping them
 * would leave a gap in stored history that nothing rebuilds.
 */
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        logger.info({ signal }, 'Shutting down');
        stopping = true;
        stopSession();
        probes?.close();
        stopWriter()
            .catch((err: Error) => logger.error({ err }, 'Final candle flush failed'))
            .then(() => Promise.allSettled([closeDb(), closeRedis()]))
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    });
}

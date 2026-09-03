/**
 * Worker entry point.
 * One image, two jobs, selected by `WORKER_ROLE`:
 *   aggregate  the live trade stream bucketed into candles          (singleton)
 *   organize   the nightly batch: prices, fundamentals, statistics
 *   all        both in one process — the single-host default
 */
import 'dotenv/config';
import { type Server } from 'http';
import { OHLCV_INDEXES, REFERENCE_INDEXES, type IndexSpec } from '@ereuna/shared';
import { startProbeServer } from '@ereuna/shared/service/probes';
import { startAggregator, stopAggregator } from '@/aggregate/index.js';
import { config } from '@/lib/config.js';
import { closeDb, connectDb, getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { closeRedis } from '@/lib/redis.js';
import { startOrganizer, stopOrganizer } from '@/organize/index.js';

const { role } = config;
const runsAggregate = role === 'all' || role === 'aggregate';
const runsOrganize = role === 'all' || role === 'organize';

let probes: Server | undefined;

async function ensureIndexes(): Promise<void> {
    const specs: IndexSpec[] = [...OHLCV_INDEXES, ...(runsOrganize ? REFERENCE_INDEXES : [])];
    const db = getDb();

    for (const { collection, keys, options } of specs) {
        try {
            await db.collection(collection).createIndex(keys, options ?? {});
        } catch (err) {
            logger.error({ err, collection, keys }, 'Index could not be created');
        }
    }

    logger.info({ count: specs.length }, 'Indexes ensured');
}

/**
 * Startup is all-or-nothing. Without Mongo there is nowhere to put a finished
 * candle, and an aggregator that consumed the stream anyway would acknowledge
 * trades it then dropped — so a failure here kills the process with a reason.
 */
connectDb()
    .then(ensureIndexes)
    .then(() => {
        probes = startProbeServer({
            port: config.probe.port,
            token: config.probe.token,
            onError: (err) => logger.error({ err }, 'Failed to render metrics'),
        });
        logger.info({ role, port: config.probe.port }, 'Worker started');

        // Both roles resolve only when stopped, so this settles at shutdown
        return Promise.all([
            runsAggregate ? startAggregator() : Promise.resolve(),
            runsOrganize ? startOrganizer() : Promise.resolve(),
        ]);
    })
    .catch((err: Error) => {
        logger.fatal({ err, role }, 'Worker failed');
        process.exit(1);
    });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        logger.info({ signal, role }, 'Shutting down');
        stopOrganizer();
        probes?.close();

        stopAggregator()
            .catch((err: Error) => logger.error({ err }, 'Final candle flush failed'))
            .then(() => Promise.allSettled([closeDb(), closeRedis()]))
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    });
}

/**
 * Worker entry point.
 * One image, two jobs, selected by `WORKER_ROLE`:
 *   aggregate  the live trade stream bucketed into candles          (singleton)
 *   organize   the nightly batch: prices, fundamentals, statistics
 *   all        both in one process — the single-host default
 */
import 'dotenv/config';
import { OHLCV_INDEXES, REFERENCE_INDEXES } from '@ereuna/shared';
import { startProbeServer } from '@ereuna/shared/service/probes';

import { startAggregator, stopAggregator } from '@/aggregate/index.js';
import { config } from '@/lib/config.js';
import { closeDb, connectDb } from '@/lib/db.js';
import { ensureIndexes } from '@/lib/indexes.js';
import { logger } from '@/lib/logger.js';
import { closeRedis } from '@/lib/redis.js';
import { startOrganizer, stopOrganizer } from '@/organize/index.js';

const { role } = config;
const runsAggregate = role === 'all' || role === 'aggregate';
const runsOrganize = role === 'all' || role === 'organize';

// Listening first starts no work: it lets kubelet see a live process while Mongo is dialled and a new index builds
const probes = startProbeServer({ ...config.probe, logger });

/**
 * Startup is all-or-nothing. Without Mongo there is nowhere to put a finished
 * candle, and an aggregator that consumed the stream anyway would acknowledge
 * trades it then dropped — so a failure here kills the process with a reason.
 */
connectDb()
    .then(() => ensureIndexes([...OHLCV_INDEXES, ...(runsOrganize ? REFERENCE_INDEXES : [])]))
    .then(() => {
        logger.info({ role, port: config.probe.port }, 'Worker started');

        // Both roles resolve only when stopped, so this settles at shutdown
        return Promise.all([
            runsAggregate ? startAggregator() : Promise.resolve(),
            runsOrganize ? startOrganizer() : Promise.resolve(),
        ]);
    })
    .catch((err: unknown) => {
        logger.fatal({ err, role }, 'Worker failed');
        process.exit(1);
    });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        logger.info({ signal, role }, 'Shutting down');
        stopOrganizer();
        probes.close();

        stopAggregator()
            .catch((err: unknown) => logger.error({ err }, 'Final candle flush failed'))
            .then(() => Promise.allSettled([closeDb(), closeRedis()]))
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    });
}

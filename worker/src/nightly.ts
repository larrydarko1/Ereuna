/**
 * `npm run nightly`: the nightly batch once, now, without starting the worker,
 * for bringing the database up to date by hand. It runs as the organize role
 * whatever the env file says, so a missing vendor key fails at startup rather
 * than as a night of refused requests. The run takes the nightly lock, so it
 * skips if the worker's own run is under way. Exits 1 when the run was skipped
 * or a step failed, which the log names.
 */
import 'dotenv/config';

import { OHLCV_INDEXES, REFERENCE_INDEXES } from '@ereuna/shared';

import { closeDb, connectDb } from '@/lib/db.js';
import { ensureIndexes } from '@/lib/indexes.js';
import { logger } from '@/lib/logger.js';
import { closeRedis } from '@/lib/redis.js';
import { runNightly } from '@/organize/index.js';

connectDb()
    .then(() => ensureIndexes([...OHLCV_INDEXES, ...REFERENCE_INDEXES]))
    .then(runNightly)
    .then((summary) => (summary !== null && summary.failed.length === 0 ? 0 : 1))
    .catch((err: unknown) => {
        logger.fatal({ err }, 'Nightly run failed');
        return 1;
    })
    .then(async (code) => {
        await Promise.allSettled([closeDb(), closeRedis()]);
        process.exit(code);
    })
    .catch(() => process.exit(1));

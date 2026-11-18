/**
 * `npm run backfill`: fill the daily bars a restore from an old backup is
 * missing, then exit. Run it before `npm run nightly`, which only looks two
 * weeks back. It takes the nightly lock, so it never overlaps a nightly run.
 * Safe to stop and run again: each symbol resumes from its first missing
 * session. Exits 1 when it was skipped for the lock or could not run at all.
 */
import 'dotenv/config';

import { OHLCV_INDEXES, REFERENCE_INDEXES } from '@ereuna/shared';

import { closeDb, connectDb } from '@/lib/db.js';
import { ensureIndexes } from '@/lib/indexes.js';
import { logger } from '@/lib/logger.js';
import { closeRedis } from '@/lib/redis.js';
import { backfill } from '@/organize/backfill.js';
import { withNightlyLock } from '@/organize/lock.js';

connectDb()
    .then(() => ensureIndexes([...OHLCV_INDEXES, ...REFERENCE_INDEXES]))
    .then(() => withNightlyLock(() => backfill(new Date())))
    .then((summary) => {
        if (summary === null) {
            logger.error('Backfill skipped: a nightly run or another backfill holds the lock');
            return 1;
        }
        logger.info(summary, 'Backfill finished');
        return 0;
    })
    .catch((err: unknown) => {
        logger.fatal({ err }, 'Backfill failed');
        return 1;
    })
    .then(async (code) => {
        await Promise.allSettled([closeDb(), closeRedis()]);
        process.exit(code);
    })
    .catch(() => process.exit(1));

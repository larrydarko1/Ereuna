/**
 * Applies index specs from the shared manifest, one at a time. Both ways the
 * worker starts (the long-running process and `npm run nightly`) apply them
 * before they write, since a run on a database nothing has indexed yet would
 * write past the unique ones.
 */
import type { IndexSpec } from '@ereuna/shared';

import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';

/** An index that cannot be built is logged and skipped: a night of prices is worth more than the run. */
export async function ensureIndexes(specs: readonly IndexSpec[]): Promise<void> {
    const db = getDb();

    for (const { collection, keys, options } of specs) {
        try {
            // eslint-disable-next-line contracts/no-db-await-in-loop, no-restricted-syntax -- the worker is this repo's manifest applier, and on half a billion bars the builds go one at a time
            await db.collection(collection).createIndex(keys, options ?? {});
        } catch (err) {
            logger.error({ err, collection, keys }, 'Index could not be created');
        }
    }

    logger.info({ count: specs.length }, 'Indexes ensured');
}

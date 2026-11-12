#!/usr/bin/env node
/**
 * Give `npm run dev:sim` a fresh copy of the real database to write into.
 * The simulator's trades become real candles on every timeframe up to weekly,
 * and replace any bar stored at the same time, so the sim stack never runs on
 * the real database. It runs on a copy, under the names in the root
 * package.json's `config`, and this script makes that copy:
 *  mongo - the database db/.env names, dumped and restored under the sim's
 *          name with its old collections dropped, then counted on both sides.
 *  redis - the sim's own numbered database: the trade stream, the candles the
 *          aggregator was still building, and the API caches. Deleted by name,
 *          not flushed, because nothing stops another project using that number.
 * Run it before the first `dev:sim`, and again whenever the copy should start
 * over from real data. Stop the stack first: the copy is not a point-in-time
 * snapshot, and a sim still writing would race the restore.
 * Usage:
 *   npm run sim:reset
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Redis } from 'ioredis';

import { CACHE_PATTERNS, clearKeys } from './lib/clear-keys.ts';
import { type Counts, collectionCounts } from './lib/collection-counts.ts';
import { dbConfig, getRequiredEnv, optionalEnv } from './lib/env.ts';

// TIINGO_STREAM and lastCandleKey in packages/shared/src/market/realtime.ts,
// which plain Node cannot import. Deleting the stream drops its consumer group
// too; the aggregator creates both again when it starts
const SIM_KEY_PATTERNS = [...CACHE_PATTERNS, 'tiingo:stream', 'aggr:last:*'];

async function main(): Promise<void> {
    const cfg = dbConfig();
    const simDb = getRequiredEnv('SIM_MONGO_DB');
    const simRedisDb = Number(getRequiredEnv('SIM_REDIS_DB'));
    const realRedisDb = Number(optionalEnv('REDIS_DB', '0'));

    if (simDb === cfg.mongoDb) throw new Error(`the sim database and the real one are both '${simDb}'`);
    if (!Number.isInteger(simRedisDb) || simRedisDb === realRedisDb) {
        throw new Error(`the sim's Redis database must be a number other than ${realRedisDb}, the real one`);
    }
    console.log(`Copying '${cfg.mongoDb}' into '${simDb}', and clearing Redis database ${simRedisDb}.\n`);

    // ── MongoDB ───────────────────────────────────────────────────────────────
    console.log('[1/2] Copying MongoDB...');
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ereuna-sim-'));
    const archive = path.join(scratch, 'dump.gz');
    try {
        execFileSync('mongodump', [`--uri=${cfg.mongoUri}`, `--db=${cfg.mongoDb}`, '--gzip', `--archive=${archive}`], {
            stdio: 'inherit',
        });
        execFileSync(
            'mongorestore',
            [
                `--uri=${cfg.mongoUri}`,
                '--gzip',
                `--archive=${archive}`,
                '--drop',
                `--nsInclude=${cfg.mongoDb}.*`,
                `--nsFrom=${cfg.mongoDb}.*`,
                `--nsTo=${simDb}.*`,
            ],
            { stdio: 'inherit' },
        );
    } finally {
        fs.rmSync(scratch, { recursive: true, force: true });
    }
    const [real, copy] = await Promise.all([
        collectionCounts(cfg.mongoUri, cfg.mongoDb),
        collectionCounts(cfg.mongoUri, simDb),
    ]);
    if (toComparable(real) !== toComparable(copy)) {
        throw new Error(`the copy does not match '${cfg.mongoDb}' — was something still writing to it?`);
    }
    console.log('      Every collection matches.\n');

    // ── Redis ─────────────────────────────────────────────────────────────────
    console.log(`[2/2] Clearing Redis database ${simRedisDb}...`);
    const redis = new Redis({
        host: optionalEnv('REDIS_HOST', 'localhost'),
        port: Number(optionalEnv('REDIS_PORT', '6379')),
        db: simRedisDb,
    });
    try {
        const cleared = await clearKeys(redis, SIM_KEY_PATTERNS);
        console.log(`      ${cleared} key${cleared === 1 ? '' : 's'} removed.\n`);
    } finally {
        redis.disconnect();
    }

    console.log('Sim reset complete. Start the stack with: npm run dev:sim');
}

/** Two databases list their collections in no promised order, so the counts are compared by name. */
function toComparable(counts: Counts): string {
    const byName = (counted: Record<string, number>): [string, number][] =>
        Object.entries(counted).toSorted(([left], [right]) => left.localeCompare(right));
    return JSON.stringify([byName(counts.collections), byName(counts.timeSeriesBuckets)]);
}

main().catch((err: unknown) => {
    console.error(`\nsim reset failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
});

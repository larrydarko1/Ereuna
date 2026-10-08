#!/usr/bin/env node
/**
 * Restore a backup taken by `npm run backup` into the database `db/.env` names,
 * check it against the backup's manifest, then clear the API's caches.
 * The target may differ from the database the backup was taken of — that is
 * how a restore drill lands on a scratch database rather than the real one.
 * Every collection the backup holds is DROPPED and replaced, so the script asks
 * for the target's name before it touches anything, and refuses to run without
 * a terminal to ask on.
 * Only the cache prefixes are cleared, not the whole Redis database: the trade
 * stream and its consumer group live there too, and so, on a development
 * machine, do other projects' keys.
 * Usage:
 *   npm run restore -- backups/<timestamp>
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

import { Redis } from 'ioredis';

import { type Counts, collectionCounts } from './lib/collection-counts.ts';
import { ROOT, dbConfig, optionalEnv } from './lib/env.ts';

type Manifest = Counts & { database: string; completedAt: string };

// `userKey` and `marketKey` in api/src/lib/cache.ts. Everything else in Redis is
// a rate-limit counter, the live feed or its last values, none of which describe
// the database
const CACHE_PREFIXES = ['u:', 'm:'];

async function main(): Promise<void> {
    const cfg = dbConfig();
    const arg = process.argv[2];
    if (arg === undefined || arg === '') throw new Error('Usage: npm run restore -- backups/<timestamp>');

    const backupDir = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
    const manifestFile = path.join(backupDir, 'manifest.json');
    if (!fs.existsSync(manifestFile)) throw new Error(`no manifest.json in ${backupDir} — not a backup this script took`);
    const manifest = parseManifest(fs.readFileSync(manifestFile, 'utf8'));

    console.log(`Restoring '${manifest.database}' from ${manifest.completedAt} into '${cfg.mongoDb}'.\n`);
    await confirm(cfg.mongoDb);

    // ── MongoDB ───────────────────────────────────────────────────────────────
    console.log('\n[1/3] Restoring MongoDB...');
    execFileSync(
        'mongorestore',
        [
            `--uri=${cfg.mongoUri}`,
            '--gzip',
            '--drop',
            `--nsInclude=${manifest.database}.*`,
            `--nsFrom=${manifest.database}.*`,
            `--nsTo=${cfg.mongoDb}.*`,
            `--dir=${path.join(backupDir, 'mongo')}`,
        ],
        { stdio: 'inherit' },
    );
    console.log('      Done.\n');

    // ── Verify ────────────────────────────────────────────────────────────────
    console.log('[2/3] Comparing against the manifest...');
    const mismatches = compare(manifest, await collectionCounts(cfg.mongoUri, cfg.mongoDb));
    if (mismatches.length > 0) {
        console.error(mismatches.map((line) => `      ${line}`).join('\n'));
        throw new Error('the restored database does not match the backup');
    }
    console.log('      Every collection matches.\n');

    // ── Caches ────────────────────────────────────────────────────────────────
    console.log('[3/3] Clearing the API caches...');
    const redis = new Redis({
        host: optionalEnv('REDIS_HOST', 'localhost'),
        port: Number(optionalEnv('REDIS_PORT', '6379')),
    });
    try {
        const cleared = await clearPrefixes(redis);
        console.log(`      ${cleared} cached entr${cleared === 1 ? 'y' : 'ies'} removed.\n`);
    } finally {
        redis.disconnect();
    }

    console.log('Restore complete.');
    console.log('Run the migrations the backup predates with: npm run db:migrate');
}

/** Type the database's name or nothing happens. A "yes" prompt is a keystroke, not a check. */
async function confirm(database: string): Promise<void> {
    if (!process.stdin.isTTY) throw new Error('refusing to restore without a terminal to confirm on');

    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt.question(`This DROPS every collection in the backup from '${database}'. Type ${database} to continue: `);
    prompt.close();
    if (answer.trim() !== database) throw new Error('confirmation did not match — nothing was changed');
}

function compare(expected: Counts, actual: Counts): string[] {
    const rows = [
        ...Object.entries(expected.collections).map(([name, n]) => [name, n, actual.collections[name], 'documents'] as const),
        ...Object.entries(expected.timeSeriesBuckets).map(
            ([name, n]) => [name, n, actual.timeSeriesBuckets[name], 'buckets'] as const,
        ),
    ];
    return rows
        .filter(([, want, got]) => want !== got)
        .map(([name, want, got, unit]) => `${name}: backed up ${want} ${unit}, restored ${got ?? 'none'}`);
}

async function clearPrefixes(redis: Redis): Promise<number> {
    let cleared = 0;

    for (const prefix of CACHE_PREFIXES) {
        let cursor = '0';
        do {
            const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 500);
            if (keys.length > 0) cleared += await redis.del(...keys);
            cursor = next;
        } while (cursor !== '0');
    }

    return cleared;
}

function parseManifest(raw: string): Manifest {
    const parsed: unknown = JSON.parse(raw);
    if (
        !isRecord(parsed) ||
        typeof parsed['database'] !== 'string' ||
        typeof parsed['completedAt'] !== 'string' ||
        !isCountMap(parsed['collections']) ||
        !isCountMap(parsed['timeSeriesBuckets'])
    ) {
        throw new Error('manifest.json is not in the shape npm run backup writes');
    }

    return {
        database: parsed['database'],
        completedAt: parsed['completedAt'],
        collections: parsed['collections'],
        timeSeriesBuckets: parsed['timeSeriesBuckets'],
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCountMap(value: unknown): value is Record<string, number> {
    return isRecord(value) && Object.values(value).every((count) => typeof count === 'number');
}

main().catch((err: unknown) => {
    console.error(`\nrestore failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
});

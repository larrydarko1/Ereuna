#!/usr/bin/env node
/**
 * Snapshot the database into `backups/<timestamp>/`.
 * What is backed up:
 *  mongo/        - a gzipped `mongodump` of every collection, the seven candle
 *                  collections included. There is nothing like an object store
 *                  here; MongoDB is the whole of the state. The candles are
 *                  most of the size, but they are not derived data — intraday
 *                  history older than the vendor's window cannot be fetched
 *                  again, so a backup without them is not one.
 *  manifest.json - when, which database, how big, and what each collection held,
 *                  counted in the dump's own files rather than in the database.
 *                  `npm run db:check` reads `backups/latest.json` to say how
 *                  stale the last backup is and to fail one that held nothing.
 * Redis is not backed up. Everything in it is a cache, a counter or a live feed,
 * and a restore clears the caches rather than bringing old ones back.
 * The directory is named to the second, not the day, so a backup taken before a
 * migration and another taken after it are two backups rather than one
 * overwriting the other.
 * The dump is not a point-in-time snapshot — that needs a replica set's oplog —
 * so stop the worker first if the bars it writes during the run matter.
 * Usage:
 *    npm run backup
 * Restore with:
 *    npm run restore -- backups/<timestamp>
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { dumpCounts } from './lib/dump-counts.ts';
import { ROOT, dbConfig } from './lib/env.ts';

const cfg = dbConfig();
const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const BACKUPS = path.join(ROOT, 'backups');
const BACKUP_DIR = path.join(BACKUPS, stamp);

async function main(): Promise<void> {
    if (fs.existsSync(BACKUP_DIR)) throw new Error(`${BACKUP_DIR} already exists`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const started = Date.now();
    console.log(`Backing up '${cfg.mongoDb}' to: ${BACKUP_DIR}\n`);

    // ── MongoDB ───────────────────────────────────────────────────────────────
    console.log(`[1/2] Dumping MongoDB database '${cfg.mongoDb}'...`);
    execFileSync(
        'mongodump',
        [`--uri=${cfg.mongoUri}`, `--db=${cfg.mongoDb}`, '--gzip', `--out=${path.join(BACKUP_DIR, 'mongo')}`],
        { stdio: 'inherit' },
    );
    console.log('      Done.\n');

    // ── Manifest ──────────────────────────────────────────────────────────────
    console.log('[2/2] Writing manifest...');
    const counts = await dumpCounts(path.join(BACKUP_DIR, 'mongo', cfg.mongoDb));
    const totalDocs = Object.values(counts.collections).reduce((sum, n) => sum + n, 0);

    const manifest = {
        completedAt: new Date().toISOString(),
        database: cfg.mongoDb,
        durationSeconds: Math.round((Date.now() - started) / 1000),
        bytes: directorySize(BACKUP_DIR),
        totalDocuments: totalDocs,
        ...counts,
    };
    fs.writeFileSync(path.join(BACKUP_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(BACKUPS, 'latest.json'), `${JSON.stringify({ ...manifest, dir: stamp }, null, 2)}\n`);
    console.log(
        `      ${totalDocs} document(s) across ${Object.keys(counts.collections).length} collection(s), ` +
            `and ${Object.keys(counts.timeSeriesBuckets).length} time series collection(s); ` +
            `${(manifest.bytes / 1e9).toFixed(2)} GB on disk.\n`,
    );

    if (totalDocs === 0) {
        console.error(`ERROR: the backup of '${cfg.mongoDb}' contains ZERO documents.`);
        console.error('       Is MONGO_URI in db/.env pointing where you think it is?');
        process.exit(1);
    }

    console.log(`Backup complete → backups/${stamp} (${manifest.durationSeconds}s)`);
    console.log(`Restore with: npm run restore -- backups/${stamp}`);
    console.log('\nA backup is not a backup until a restore has been tested — see db/docs/restore-drills.md');
}

function directorySize(dir: string): number {
    return fs
        .readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .reduce((sum, entry) => sum + fs.statSync(path.join(entry.parentPath, entry.name)).size, 0);
}

main().catch((err: unknown) => {
    console.error(`\nbackup failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
});

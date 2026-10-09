/** What a dump holds, read from its own files rather than from the database it was taken of. */
import fs from 'node:fs';
import path from 'node:path';
import { createGunzip, gunzipSync } from 'node:zlib';

import type { Counts } from './collection-counts.ts';

const BSON_FILE = /\.bson(\.gz)?$/;

/**
 * Documents per collection and buckets per time series collection, counted in
 * the `.bson` files `mongodump` wrote for one database. Counting the live
 * database after the dump would describe it a moment later — every write made
 * while the dump ran is in one and not the other — so a restore would be held to
 * numbers no dump could match. Reading every file to the end also proves the dump
 * can be read back: a truncated file throws here, before a restore drops
 * anything on its strength.
 */
export async function dumpCounts(dir: string): Promise<Counts> {
    const files = fs.readdirSync(dir).filter((file) => BSON_FILE.test(file) && !file.startsWith('system.'));

    const counts = await Promise.all(
        files.map(async (file) => {
            const name = file.replace(BSON_FILE, '');
            const metadata = path.join(dir, `${name}.metadata.json${file.endsWith('.gz') ? '.gz' : ''}`);
            const count = await countDocuments(path.join(dir, file)).catch((err: unknown) => {
                throw new Error(`${file} cannot be read back: ${err instanceof Error ? err.message : String(err)}`);
            });
            return [name, count, isTimeSeries(metadata)] as const;
        }),
    );
    return {
        collections: Object.fromEntries(counts.filter(([, , series]) => !series).map(([name, n]) => [name, n])),
        timeSeriesBuckets: Object.fromEntries(counts.filter(([, , series]) => series).map(([name, n]) => [name, n])),
    };
}

/** A BSON file is its documents end to end, each opening with its own length as an int32. */
async function countDocuments(file: string): Promise<number> {
    const stream: AsyncIterable<Buffer> = file.endsWith('.gz') ? gunzipped(file) : fs.createReadStream(file);

    const header = Buffer.alloc(4);
    let headerBytes = 0;
    let remaining = 0;
    let count = 0;

    for await (const chunk of stream) {
        let at = 0;
        while (at < chunk.length) {
            if (remaining > 0) {
                const step = Math.min(remaining, chunk.length - at);
                remaining -= step;
                at += step;
                continue;
            }
            const step = Math.min(4 - headerBytes, chunk.length - at);
            chunk.copy(header, headerBytes, at, at + step);
            headerBytes += step;
            at += step;
            if (headerBytes < 4) continue;

            const length = header.readInt32LE(0);
            if (length < 5) throw new Error(`not a BSON dump — it holds a ${length}-byte document`);
            remaining = length - 4;
            headerBytes = 0;
            count += 1;
        }
    }

    if (remaining > 0 || headerBytes > 0) throw new Error('it ends partway through a document — the dump is truncated');
    return count;
}

function gunzipped(file: string): AsyncIterable<Buffer> {
    const source = fs.createReadStream(file);
    const gunzip = createGunzip();
    // Pipe does not forward a read error, and the loop would wait on the gunzip forever
    source.on('error', (err) => gunzip.destroy(err));
    return source.pipe(gunzip);
}

function isTimeSeries(metadata: string): boolean {
    const raw = fs.readFileSync(metadata);
    const parsed: unknown = JSON.parse((metadata.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'));
    return typeof parsed === 'object' && parsed !== null && 'type' in parsed && parsed.type === 'timeseries';
}

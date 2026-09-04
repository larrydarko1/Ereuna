#!/usr/bin/env node
/**
 * Record the checksum of every migration file.
 * `scripts/checks/check-db-drift.mjs` compares the migrations against these
 * hashes and fails if one has moved — enforcing "never edit a merged migration"
 * mechanically rather than by memory.
 * Run this ONLY when adding a migration:
 *   npm run db:checksums
 * It refuses to overwrite the checksum of an existing migration, because that is
 * the thing the gate exists to prevent. If a migration has genuinely never been
 * applied anywhere, pass --force to re-baseline it.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT as ROOT } from './lib/repo-root.mjs';

const MIGRATIONS_DIR = path.join(ROOT, 'db/migrations');
const CHECKSUMS = path.join(MIGRATIONS_DIR, '.checksums.json');

const force = process.argv.includes('--force');

const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();

const existing = fs.existsSync(CHECKSUMS) ? JSON.parse(fs.readFileSync(CHECKSUMS, 'utf8')) : {};

const hash = (file) =>
    crypto.createHash('sha256').update(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')).digest('hex');

const next = {};
const added = [];
const changed = [];

for (const file of files) {
    const current = hash(file);

    if (file in existing && existing[file] !== current && !force) {
        changed.push(file);
        next[file] = existing[file]; // keep the original — never silently bless an edit
        continue;
    }
    if (!(file in existing)) added.push(file);
    next[file] = current;
}

if (changed.length > 0) {
    console.error('✖ These migrations have been MODIFIED since they were committed:\n');
    for (const file of changed) console.error(`  • ${file}`);
    console.error(
        '\n  A migration that has already run in an environment cannot be changed.\n' +
            '  Write a new forward migration instead. See db/migrations/README.md.\n' +
            '\n  If it has genuinely never been applied anywhere, re-baseline with:\n' +
            '    npm run db:checksums -- --force\n',
    );
    process.exit(1);
}

fs.writeFileSync(CHECKSUMS, `${JSON.stringify(next, null, 4)}\n`);

for (const file of Object.keys(existing).filter((f) => !files.includes(f))) {
    console.warn(`⚠  ${file} was removed. A merged migration should never be deleted.`);
}

console.log(`✔ recorded ${files.length} migration checksum(s)${added.length > 0 ? ` (${added.length} new)` : ''}`);

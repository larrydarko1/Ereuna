/**
 * Contract test for the migrations directory as a whole.
 * Every rule here is one a reviewer would have to remember on every pull
 * request, and would eventually not.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ALL_COLLECTIONS, INDEXES, OHLCV_INDEXES, REFERENCE_INDEXES } from '@ereuna/shared';

const DB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(DB_DIR, 'migrations');

const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();

const loaded: Record<string, Record<string, unknown>> = Object.fromEntries(
    await Promise.all(
        migrationFiles.map(async (file) => [
            file,
            await import(pathToFileURL(path.join(MIGRATIONS_DIR, file)).href),
        ]),
    ),
);

const allIndexes = [...INDEXES, ...OHLCV_INDEXES, ...REFERENCE_INDEXES];

describe('migrations contract', () => {
    it('finds migration files to check', () => {
        expect(migrationFiles.length).toBeGreaterThan(0);
    });

    describe.each(migrationFiles)('%s', (file) => {
        const source = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        const migration = loaded[file];

        it('exports an up()', () => {
            expect(typeof migration.up).toBe('function');
        });

        it('exports no down() — migrations are forward-only', () => {
            expect(migration.down).toBeUndefined();
        });

        it('does not create indexes — those live in the index manifest', () => {
            expect(source).not.toMatch(/\.createIndex\s*\(/);
        });

        it('is timestamp-prefixed', () => {
            expect(file).toMatch(/^\d{14}-[a-z0-9-]+\.js$/);
        });

        it('has a test file', () => {
            const testName = `${file.replace(/^\d{14}-/, '').replace(/\.js$/, '')}.test.ts`;
            expect(
                fs.existsSync(path.join(DB_DIR, '__tests__', testName)),
                `expected db/__tests__/${testName}`,
            ).toBe(true);
        });
    });
});

describe('index manifest', () => {
    it('only indexes collections that exist', () => {
        const known = new Set(ALL_COLLECTIONS);
        const unknown = allIndexes.filter((index) => !known.has(index.collection)).map((index) => index.collection);
        expect(unknown).toEqual([]);
    });

    it('has no duplicate index on the same collection and keys', () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];

        for (const { collection, keys } of allIndexes) {
            const id = `${collection}:${JSON.stringify(keys)}`;
            if (seen.has(id)) duplicates.push(id);
            seen.add(id);
        }

        expect(duplicates).toEqual([]);
    });

    it('explains why every index exists', () => {
        const unexplained = allIndexes
            .filter((index) => index.why.trim().length < 10)
            .map((index) => `${index.collection}:${JSON.stringify(index.keys)}`);
        expect(unexplained).toEqual([]);
    });

    it('gives every TTL index an expireAfterSeconds', () => {
        for (const index of allIndexes) {
            if ('expiresAt' in index.keys) {
                expect(index.options?.expireAfterSeconds, `${index.collection}.expiresAt`).toBe(0);
            }
        }
    });
});

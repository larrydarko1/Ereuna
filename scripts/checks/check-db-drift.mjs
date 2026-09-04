#!/usr/bin/env node
/**
 * Database drift gate.
 * Each rule is here because of a failure that is invisible in a diff:
 *   • the collection registry and the bootstrap migration disagreeing about
 *     which collections exist, so a fresh database is missing one;
 *   • the registry importing something at runtime, which breaks the migration
 *     rather than the build — migrations run as plain `.js` under the
 *     migrate-mongo CLI, with no bundler and no path aliases;
 *   • docs describing a schema the code stopped having, which is what the
 *     twenty-five hand-written collection files this replaced had become;
 *   • an example document carrying a field no type declares;
 *   • a collection with no index and no recorded reason for having none;
 *   • a migration merged without a test, or edited after it was applied;
 *   • an index dropped from a service instead of from a migration, which
 *     rebuilds it on every restart of every replica.
 * Rules from the reference implementation that DO NOT APPLY here, so that their
 * absence is a recorded decision rather than an oversight:
 *   - Backup freshness and the restore-drill log. There is no backup pipeline
 *     in this repo and no host to restore onto; when one lands, this comes back
 *     with it.
 *   - A `down()` ban enforced by ESLint. ESLint is not installed yet, so rule 8
 *     asserts it directly, and db/__tests__/migrations-contract.test.ts asserts
 *     it a second time.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const MANIFEST = 'packages/shared/src/db/indexes.ts';
const BOOTSTRAP = 'db/migrations/20260904000000-bootstrap-ereuna-collections.js';
const ARCHITECTURE = 'db/docs/architecture.md';
const EXAMPLES_DIR = 'db/docs/examples';
const MIGRATIONS_DIR = 'db/migrations';
const TESTS_DIR = 'db/__tests__';
const CHECKSUMS = 'db/migrations/.checksums.json';

/** Which type declares each collection's document shape. Checked, not assumed. */
const COLLECTION_TYPES = {
    Users: 'UserDoc',
    RefreshTokens: 'RefreshTokenDoc',
    Screeners: 'ScreenerDoc',
    Watchlists: 'WatchlistDoc',
    Portfolios: 'PortfolioDoc',
    Positions: 'PositionDoc',
    Trades: 'TradeDoc',
    Notes: 'NoteDoc',
    ChartDrawings: 'ChartDrawingDoc',
    OHCLVData: 'OhlcvDoc',
    OHCLVData2: 'OhlcvDoc',
    OHCLVData1m: 'OhlcvDoc',
    OHCLVData5m: 'OhlcvDoc',
    OHCLVData15m: 'OhlcvDoc',
    OHCLVData30m: 'OhlcvDoc',
    OHCLVData1hr: 'OhlcvDoc',
    AssetInfo: 'AssetInfoDoc',
    News: 'NewsDoc',
    Calendar: 'CalendarEventDoc',
    Stats: 'StatsDoc',
};

const TYPES_FILE = 'packages/shared/src/db/collections.ts';

/**
 * Collections that deliberately carry no index, and why. An entry here is a
 * decision; a collection missing from both this and the manifest is an
 * oversight, and every query against it is a collection scan.
 */
const NO_INDEX_BY_DESIGN = {
    Stats: 'Three singleton documents addressed by a string `_id`, which is indexed by MongoDB itself.',
};

const errors = [];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** `Users` → `users`, `AssetInfo` → `asset-info`, `OHCLVData1m` → `ohclvdata1m`. */
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const migrationFiles = () =>
    fs
        .readdirSync(path.join(ROOT, MIGRATIONS_DIR))
        .filter((file) => file.endsWith('.js'))
        .sort();

// ── 0. Anchors ───────────────────────────────────────────────────────────────
// Every rule below reads one of these. A moved file has to be a hard stop, or
// the rules that depended on it quietly stop checking anything.
{
    for (const rel of [MANIFEST, TYPES_FILE, BOOTSTRAP, ARCHITECTURE, EXAMPLES_DIR, MIGRATIONS_DIR, TESTS_DIR]) {
        if (!exists(rel)) {
            console.error(`✖ ${rel} does not exist. Every rule in this gate reads it — fix the path before anything else.`);
            process.exit(1);
        }
    }
}

// ── 1. The registry loads under plain Node ───────────────────────────────────
// Not a formality: db/migrations/*.js imports it through the migrate-mongo CLI,
// which has no bundler and no alias resolution. A runtime import added to the
// manifest breaks `npm run db:migrate` and nothing else, so nothing else would
// catch it.
let manifest;
{
    try {
        manifest = await import(pathToFileURL(path.join(ROOT, MANIFEST)).href);
    } catch (err) {
        console.error(
            `✖ ${MANIFEST} does not load under plain Node: ${String(err.message).split('\n')[0]}\n` +
                '  The bootstrap migration imports it through the migrate-mongo CLI, where there is no\n' +
                '  bundler and no path aliases. Keep every import in that file type-only.',
        );
        process.exit(1);
    }

    for (const name of ['COLLECTIONS', 'ALL_COLLECTIONS', 'INDEXES', 'OHLCV_INDEXES', 'REFERENCE_INDEXES']) {
        if (manifest[name] === undefined) {
            console.error(`✖ ${MANIFEST} no longer exports ${name}. This gate and the migrations both read it.`);
            process.exit(1);
        }
    }
}

const collections = [...manifest.ALL_COLLECTIONS];
const allIndexes = [...manifest.INDEXES, ...manifest.OHLCV_INDEXES, ...manifest.REFERENCE_INDEXES];
const indexed = new Set(allIndexes.map((index) => index.collection));

// ── 2. The bootstrap migration tracks the registry ───────────────────────────
{
    const src = read(BOOTSTRAP);
    if (/const [A-Z_]*COLLECTIONS\s*=\s*\[/.test(src)) {
        errors.push(
            `${BOOTSTRAP}: declares its own collection list. Import ALL_COLLECTIONS from the registry (${MANIFEST}) — a second copy is the drift this gate exists for.`,
        );
    } else if (!/ALL_COLLECTIONS.*from '@ereuna\/shared\/db\/indexes'/s.test(src)) {
        errors.push(
            `${BOOTSTRAP}: does not import ALL_COLLECTIONS from '@ereuna/shared/db/indexes'. A fresh database gets its collections from this migration, so it has to track the registry.`,
        );
    }
}

// ── 3. Every collection is indexed, or says why not ──────────────────────────
for (const collection of collections) {
    if (indexed.has(collection)) continue;
    if (collection in NO_INDEX_BY_DESIGN) continue;
    errors.push(
        `${MANIFEST}: '${collection}' has no index and no entry in NO_INDEX_BY_DESIGN. Every query against it is a collection scan — declare an index, or record why it does not need one.`,
    );
}
for (const collection of Object.keys(NO_INDEX_BY_DESIGN)) {
    if (indexed.has(collection)) {
        errors.push(
            `${path.relative(ROOT, import.meta.filename)}: '${collection}' is listed as needing no index, but the manifest now declares one. Remove the exemption.`,
        );
    }
}

// ── 4. Every collection has an example document ──────────────────────────────
const exampleCollection = (file) => file.replace(/\.json$/, '').split('.')[0];
const exampleFiles = fs.readdirSync(path.join(ROOT, EXAMPLES_DIR)).filter((file) => file.endsWith('.json'));

{
    const present = new Set(exampleFiles.map((file) => file.replace(/\.json$/, '')));

    for (const collection of collections) {
        if (!present.has(kebab(collection))) {
            errors.push(`${EXAMPLES_DIR}/${kebab(collection)}.json is missing — every collection needs a realistic (fake) example document.`);
        }
    }
    for (const file of exampleFiles) {
        if (!collections.some((collection) => kebab(collection) === exampleCollection(file))) {
            errors.push(`${EXAMPLES_DIR}/${file} documents a collection that is not in the registry. Delete it, or add the collection.`);
        }
    }
}

// ── 5. Docs and examples describe the REAL document shape ────────────────────
/** The top-level fields of `type Name = { … }`, ignoring anything nested. */
function typeFields(src, typeName) {
    const opener = new RegExp(`^\\s*(?:export\\s+)?type ${typeName}\\s*=\\s*\\{`, 'm').exec(src);
    if (opener === null) return null;

    let depth = 1;
    let top = '';
    for (let i = opener.index + opener[0].length; i < src.length && depth > 0; i++) {
        const ch = src[i];
        if (ch === '{') {
            if (depth === 1) top += ch;
            depth++;
        } else if (ch === '}') {
            depth--;
        } else if (depth === 1) {
            top += ch;
        }
    }

    const code = top.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return {
        // An index signature means the document carries fields the type cannot
        // name — AssetInfo's nightly jobs each attach their own — so an example
        // with extra keys is correct rather than stale.
        open: /\[\s*\w+\s*:\s*string\s*\]\s*:/.test(code),
        fields: [...code.matchAll(/(?:^|[;\n{])\s*(\w+)(\??)\s*:/g)].map((match) => ({
            name: match[1],
            optional: match[2] === '?',
        })),
    };
}

/** The field names in the `#### Collection` table of architecture.md. */
function documentedFields(doc, collection) {
    const start = doc.indexOf(`#### ${collection}\n`);
    if (start === -1) return null;
    const rest = doc.slice(start + 1);
    const next = rest.search(/\n#{2,4} /);
    const section = next === -1 ? rest : rest.slice(0, next);
    return [...section.matchAll(/^\| `(\w+)`\s*\|/gm)].map((match) => match[1]);
}

{
    const doc = read(ARCHITECTURE);
    const typeSrc = read(TYPES_FILE);

    for (const collection of collections) {
        const typeName = COLLECTION_TYPES[collection];
        if (typeName === undefined) {
            errors.push(
                `${path.relative(ROOT, import.meta.filename)}: '${collection}' has no entry in COLLECTION_TYPES. ` +
                    'Point it at the type that declares its document shape, so its docs and example can be checked against something.',
            );
            continue;
        }

        const type = typeFields(typeSrc, typeName);
        if (type === null) {
            errors.push(`${TYPES_FILE}: no "type ${typeName} = { … }" — '${collection}' is mapped to a type that does not exist.`);
            continue;
        }

        const declared = new Set(type.fields.map((field) => field.name).filter((name) => name !== '_id'));
        const required = type.fields.filter((field) => !field.optional && field.name !== '_id').map((field) => field.name);

        const documented = documentedFields(doc, collection);
        if (documented !== null) {
            for (const field of declared) {
                if (!documented.includes(field)) {
                    errors.push(`${ARCHITECTURE}: the '${collection}' table is missing \`${field}\`, which is a field of ${typeName}.`);
                }
            }
            for (const field of documented) {
                if (field !== '_id' && !declared.has(field)) {
                    errors.push(`${ARCHITECTURE}: the '${collection}' table documents \`${field}\`, which is not a field of ${typeName}.`);
                }
            }
            for (const field of new Set(documented.filter((f, i) => documented.indexOf(f) !== i))) {
                errors.push(`${ARCHITECTURE}: the '${collection}' table lists \`${field}\` more than once.`);
            }
        }

        for (const file of exampleFiles.filter((f) => exampleCollection(f) === kebab(collection))) {
            const rel = `${EXAMPLES_DIR}/${file}`;
            let example;
            try {
                example = JSON.parse(read(rel));
            } catch (err) {
                errors.push(`${rel}: is not valid JSON (${err.message}).`);
                continue;
            }

            const keys = Object.keys(example);
            if (!type.open) {
                for (const key of keys) {
                    if (key !== '_id' && !declared.has(key)) {
                        errors.push(`${rel}: has \`${key}\`, which is not a field of ${typeName}. The example documents a schema that does not exist.`);
                    }
                }
            }
            for (const field of required) {
                if (!keys.includes(field)) {
                    errors.push(`${rel}: is missing \`${field}\`, which ${typeName} declares as required — every real document has it.`);
                }
            }
        }
    }
}

// ── 6. architecture.md ↔ registry ────────────────────────────────────────────
{
    const doc = read(ARCHITECTURE);
    const documented = [...doc.matchAll(/^#### (\w+)$/gm)].map((match) => match[1]);

    for (const collection of collections) {
        if (!documented.includes(collection)) {
            errors.push(`${ARCHITECTURE}: '${collection}' is not documented (expected a "#### ${collection}" heading).`);
        }
    }
    for (const heading of documented) {
        if (!collections.includes(heading)) {
            errors.push(`${ARCHITECTURE}: documents '${heading}', which is not in the registry. The docs describe software that does not exist.`);
        }
    }

    const stated = /contains \*\*(\d+) collections\*\*/.exec(doc);
    if (stated === null) {
        errors.push(`${ARCHITECTURE}: expected an overview line of the form "contains **N collections**".`);
    } else if (Number(stated[1]) !== collections.length) {
        errors.push(`${ARCHITECTURE}: says ${stated[1]} collections; the registry has ${collections.length}.`);
    }

    const listed = [...doc.matchAll(/^\| `(\d{14}-[a-z0-9-]+)`/gm)].map((match) => match[1]);
    const onDisk = migrationFiles().map((file) => file.replace(/\.js$/, ''));

    for (const name of listed) {
        if (!onDisk.includes(name)) {
            errors.push(`${ARCHITECTURE}: the migration history lists \`${name}\`, which does not exist in ${MIGRATIONS_DIR}/.`);
        }
    }
    for (const name of onDisk) {
        if (!listed.includes(name)) {
            errors.push(`${ARCHITECTURE}: migration \`${name}\` is missing from the migration history table.`);
        }
    }
}

// ── 7. Every migration has a test ────────────────────────────────────────────
for (const file of migrationFiles()) {
    const testName = `${file.replace(/^\d{14}-/, '').replace(/\.js$/, '')}.test.ts`;
    if (!exists(path.join(TESTS_DIR, testName))) {
        errors.push(`${TESTS_DIR}/${testName} is missing — every migration needs a test proving it is idempotent.`);
    }
}

// ── 8. Every migration loads, exports up(), and exports no down() ────────────
for (const file of migrationFiles()) {
    const src = read(path.join(MIGRATIONS_DIR, file));

    if (/\.createIndex\s*\(/.test(src)) {
        errors.push(
            `${MIGRATIONS_DIR}/${file}: creates an index. Indexes have one definition site — ${MANIFEST} — and are applied at boot. Only a DROP belongs in a migration.`,
        );
    }
    if (!/^\d{14}-[a-z0-9-]+\.js$/.test(file)) {
        errors.push(`${MIGRATIONS_DIR}/${file}: is not named <14-digit timestamp>-<kebab-name>.js, so migrate-mongo cannot order it.`);
    }

    try {
        const mod = await import(pathToFileURL(path.join(ROOT, MIGRATIONS_DIR, file)).href);
        if (typeof mod.up !== 'function') {
            errors.push(`${MIGRATIONS_DIR}/${file}: does not export an up() function.`);
        }
        if (mod.down !== undefined) {
            errors.push(
                `${MIGRATIONS_DIR}/${file}: exports a down(). Migrations are forward-only — a reversal that loses data is a second, unreviewed migration that runs under pressure. See ${MIGRATIONS_DIR}/README.md.`,
            );
        }
    } catch (err) {
        errors.push(
            `${MIGRATIONS_DIR}/${file}: fails to import under plain Node (${err.code ?? 'error'}) — migrate-mongo would fail the same way. ${String(err.message).split('\n')[0]}`,
        );
    }
}

// ── 9. Merged migrations are immutable ───────────────────────────────────────
{
    const files = migrationFiles();
    const hash = (file) =>
        crypto.createHash('sha256').update(read(path.join(MIGRATIONS_DIR, file))).digest('hex');

    if (!exists(CHECKSUMS)) {
        errors.push(`${CHECKSUMS} is missing. Run: npm run db:checksums`);
    } else {
        const recorded = JSON.parse(read(CHECKSUMS));

        for (const file of files) {
            if (!(file in recorded)) {
                errors.push(`${file} has no recorded checksum. If it is new, run: npm run db:checksums`);
            } else if (recorded[file] !== hash(file)) {
                errors.push(
                    `${file} has been MODIFIED since it was committed.\n` +
                        '    A migration that has already run in an environment cannot be changed —\n' +
                        '    editing it does nothing there, and desynchronises it from environments\n' +
                        '    that have not run it yet. Write a new forward migration instead.\n' +
                        '    (If it has genuinely never been applied anywhere, re-baseline with\n' +
                        '     npm run db:checksums -- --force.)',
                );
            }
        }
        for (const file of Object.keys(recorded)) {
            if (!files.includes(file)) {
                errors.push(`${CHECKSUMS} records ${file}, which no longer exists. A merged migration must never be deleted.`);
            }
        }
    }
}

// ── 10. Only a migration drops an index ──────────────────────────────────────
// A drop that runs at boot rebuilds the index on the next restart, on every
// replica, forever. It must run exactly once, which is what a migration is.
{
    const walk = (dir) =>
        fs.existsSync(path.join(ROOT, dir))
            ? fs
                  .readdirSync(path.join(ROOT, dir), { withFileTypes: true })
                  .flatMap((entry) =>
                      entry.isDirectory()
                          ? walk(path.join(dir, entry.name))
                          : entry.name.endsWith('.ts')
                            ? [path.join(dir, entry.name)]
                            : [],
                  )
            : [];

    for (const rel of ['api/src', 'worker/src', 'ingestor/src', 'packages/shared/src'].flatMap(walk)) {
        if (/\.dropIndex\s*\(|\.dropIndexes\s*\(/.test(read(rel))) {
            errors.push(`${rel}: drops an index. That belongs in a migration — a drop applied at startup rebuilds the index on every restart of every replica.`);
        }
    }
}

// ── 11. Every service drains before it exits ─────────────────────────────────
// An eviction sends SIGTERM. Without a handler the Mongo client is severed
// mid-write rather than closed, and the aggregator acknowledges trades it then
// dropped.
for (const rel of ['api/src/index.ts', 'worker/src/index.ts', 'ingestor/src/index.ts']) {
    const src = read(rel);
    for (const signal of ['SIGTERM', 'SIGINT']) {
        if (!src.includes(signal)) {
            errors.push(`${rel}: no ${signal} handler. Without one, in-flight work is severed rather than drained.`);
        }
    }
    if (!/closeDb\(\)/.test(src)) {
        errors.push(`${rel}: the shutdown path does not call closeDb(). Closing the server alone leaves the Mongo client open with its writes unfinished.`);
    }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (errors.length > 0) {
    console.error(`✖ Database drift — ${errors.length} problem(s):\n`);
    for (const error of errors) console.error(`  • ${error}`);
    console.error('');
    process.exit(1);
}

console.log(
    `✔ Database consistent: ${collections.length} collections, ${allIndexes.length} indexes across 3 manifests, ` +
        `${migrationFiles().length} migrations each tested and unchanged since commit.`,
);

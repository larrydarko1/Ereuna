#!/usr/bin/env node
/**
 * package.json conformance gate.
 *   1. REQUIRED METADATA. The standard's "Required package.json Metadata"
 *      table. Split by role: the root manifest is the project's identity and
 *      carries the full set; workspace manifests are private, never published,
 *      and inherit toolchain facts (engines, packageManager) from the root, so
 *      re-stating them per workspace is duplication that can silently drift.
 *   2. SEMVER PREFIXES. `^` for everything, `~` for TypeScript only (its minor
 *      releases introduce new type errors), never an exact pin — an exact pin
 *      silently opts out of security patches, and the lockfile is the real pin.
 *   3. FIELD ORDER. The sort-package-json canonical order, so manifests stay
 *      diff-friendly and predictable across workspaces.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const CANONICAL_ORDER = [
    'name',
    'version',
    'description',
    'keywords',
    'homepage',
    'bugs',
    'license',
    'author',
    'contributors',
    'funding',
    'type',
    'files',
    'main',
    'browser',
    'module',
    'types',
    'typings',
    'exports',
    'sideEffects',
    'imports',
    'bin',
    'man',
    'directories',
    'repository',
    'scripts',
    'config',
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'peerDependenciesMeta',
    'optionalDependencies',
    'bundleDependencies',
    'overrides',
    'resolutions',
    'packageManager',
    'engines',
    'os',
    'cpu',
    'private',
    'publishConfig',
    'workspaces',
    'browserslist',
    'lint-staged',
];

const ROOT_REQUIRED = [
    'name',
    'version',
    'description',
    'homepage',
    'license',
    'author',
    'repository',
    'engines',
    'private',
    'packageManager',
    'type',
];

const WORKSPACE_REQUIRED = ['name', 'version', 'description', 'license', 'private', 'type'];

const manifests = [
    { file: 'package.json', required: ROOT_REQUIRED, label: 'root' },
    ...JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
        .workspaces.map((w) => ({ file: path.join(w, 'package.json'), required: WORKSPACE_REQUIRED, label: w }))
        .filter((m) => fs.existsSync(path.join(ROOT, m.file))),
];

let failed = false;

const fail = (label, headline, details = []) => {
    failed = true;
    console.error(`\n✖ ${label}: ${headline}`);
    for (const d of details) console.error(`    - ${d}`);
};

for (const { file, required, label } of manifests) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    const keys = Object.keys(pkg);

    // ── 1. Required metadata ────────────────────────────────────────────────
    const missing = required.filter((f) => pkg[f] === undefined || pkg[f] === '');
    if (missing.length) {
        fail(file, `missing ${missing.length} required field(s) — see npm.instructions.md`, missing);
    }

    if (pkg.private !== undefined && pkg.private !== true) {
        fail(file, '`private` must be `true` — it is the guard against `npm publish`.');
    }

    // ── 2. Semver prefixes ──────────────────────────────────────────────────
    for (const field of ['dependencies', 'devDependencies']) {
        for (const [name, range] of Object.entries(pkg[field] ?? {})) {
            if (range.startsWith('workspace:') || range.startsWith('file:') || range.startsWith('*')) continue;

            if (name === 'typescript') {
                if (!range.startsWith('~')) {
                    fail(
                        file,
                        `${field}.typescript is "${range}" — TypeScript must use "~" (patch-only). ` +
                            'Its minor releases can introduce new type errors.',
                    );
                }
                continue;
            }
            if (!range.startsWith('^')) {
                const why = /^\d/.test(range)
                    ? 'an exact pin opts out of security patches — the lockfile is the real pin'
                    : 'the standard is "^" for every dependency except TypeScript';
                fail(file, `${field}.${name} is "${range}" — expected a "^" range (${why}).`);
            }
        }
    }

    // ── 3. Field order ──────────────────────────────────────────────────────
    const known = keys.filter((k) => CANONICAL_ORDER.includes(k));
    const sorted = [...known].sort((a, b) => CANONICAL_ORDER.indexOf(a) - CANONICAL_ORDER.indexOf(b));
    if (known.join() !== sorted.join()) {
        fail(
            file,
            'fields are out of canonical order (sort-package-json order — see npm.instructions.md)',
            [`found:    ${known.join(' → ')}`, `expected: ${sorted.join(' → ')}`],
        );
    }

    const unknown = keys.filter((k) => !CANONICAL_ORDER.includes(k));
    if (unknown.length) {
        console.warn(
            `\n⚠ ${label}: field(s) not in the canonical order list, position unchecked: ${unknown.join(', ')}` +
                '\n  Add them to CANONICAL_ORDER in this script if they are here to stay.',
        );
    }
}

if (failed) {
    console.error('\nFix the manifests above, then re-run.');
    process.exit(1);
}

console.log(`\nAll ${manifests.length} package.json files conform (metadata, semver prefixes, field order).`);
console.log('Dependency CATEGORY grouping is not machine-checkable (JSON has no comments) — review it by hand.');

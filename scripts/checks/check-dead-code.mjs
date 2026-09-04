#!/usr/bin/env node
/**
 * Dead-code gate — the reachability half of "unused", which a linter cannot see.
 * A linter reasons inside one file; this asks the whole graph whether anything
 * reaches a module at all. The first run proved the difference: every one of the
 * 143 frontend files came back unreachable, because `index.html` pointed at
 * `/src/main.js` and the entry point is `main.ts`. Nothing else in the repo
 * noticed — the typecheck compiles files it is given, the build has its own
 * resolution, and a stale entry in the HTML is invisible in a diff.
 *   files    — a module no entry point reaches. Delete it, or wire it up. The
 *              two in the first batch were a constants table for a fund screen
 *              that was cut, and an `injectStrict` helper from before the
 *              composables replaced provide/inject.
 *   exports  — exported, imported nowhere. Most of this repo's are the shape
 *              left by the rewrite: a service split into `-tokens`, `-crud`,
 *              `-rebuild` files where every helper was exported on the way out
 *              and only some were ever imported back.
 *   types    — same, for `export type`, and the more dangerous of the two: a
 *              stale exported type reads as a contract, so the next person
 *              writes against a shape nothing produces any more.
 *   deps     — declared in a package.json, imported nowhere in that workspace.
 *              Note the placement case this caught: `prom-client` sat in api,
 *              worker and ingestor while the only file importing it is
 *              `packages/shared/src/service/probes.ts` — three declarations that
 *              only ever resolved through npm's hoisting. `devDependencies`
 *              counts the same way, a dev tool nothing runs still costs every
 *              install, and `optionalPeerDependencies` rounds the manifest out.
 *   ns*       — `nsExports` / `nsTypes` / `namespaceMembers`: reachable ONLY
 *              through a namespace import, never named directly. The service
 *              barrels are imported that way, which is enough to keep every
 *              member of one looking alive; knip resolves the member accesses.
 *   enumMembers — a case in an enum nothing ever compares against.
 *   duplicates  — the same symbol exported twice under different names. One is
 *              what callers use; the other is what someone imports by mistake.
 * NOT GATED, deliberately — the line is "dead code, not drift":
 *   - `unlisted` / `binaries` / `unresolved`. The mirror image — imported but
 *     not declared — is real drift and worth fixing, but it is a manifest
 *     problem, not dead code, and gating it here would fail the build for a
 *     reason this gate's name does not describe. `npm run dead:check -- --all`
 *     shows them.
 *   - `cycles`. A cycle is a claim about direction, not about reachability;
 *     every file in one is alive. It wants its own check.
 *   - `catalog` / `catalogReferences`. pnpm catalogs. This is an npm workspace.
 *   - SCSS. knip does not follow `@use`, so every partial under
 *     `styles/components/` would come back unused while `index.scss` imports it.
 *     stylelint owns those files.
 *   - `frontend/src/lib/lightweight-charts/`. A frozen vendored fork of upstream
 *     code, excluded in knip.json the same way every other gate excludes it.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const CATEGORIES = {
    files: {
        label: 'Unused files',
        fix: 'No entry point reaches this module. Delete it, or import it from something that is reached.',
    },
    exports: {
        label: 'Unused exports',
        fix: 'Nothing imports this. Drop the `export` keyword if the value is still used inside its own file, otherwise delete it. If it is public by design, tag it `/** @public */`.',
    },
    types: {
        label: 'Unused exported types',
        fix: 'Nothing imports this type. Unexport or delete it — a stale exported type reads as a contract and will be written against.',
    },
    nsExports: {
        label: 'Unused exports in a namespace',
        fix: 'Only reachable via `import * as ns` and never accessed off it. The live namespace is what kept it looking used — same fix as an unused export: unexport or delete.',
    },
    nsTypes: {
        label: 'Unused exported types in a namespace',
        fix: 'Only reachable via `import * as ns` and never referenced off it. Unexport or delete.',
    },
    namespaceMembers: {
        label: 'Unused namespace members',
        fix: 'A member of a namespace nothing reads. Delete it — the namespace being imported says nothing about this member being used.',
    },
    enumMembers: {
        label: 'Unused enum members',
        fix: 'Nothing ever compares against this case. Delete it, or find out which code path was supposed to produce it.',
    },
    duplicates: {
        label: 'Duplicate exports',
        fix: 'The same symbol is exported twice under different names. Keep the one callers use and delete the alias — the spare is what someone imports by mistake a year from now.',
    },
    dependencies: {
        label: 'Unused dependencies',
        fix: 'Declared in this package.json, imported nowhere in that workspace. Remove it — or move the declaration to the workspace whose code actually imports it.',
    },
    devDependencies: {
        label: 'Unused devDependencies',
        fix: 'Declared in this package.json, used by nothing in that workspace. Uninstall it — a dev tool nothing runs still costs every install.',
    },
    optionalPeerDependencies: {
        label: 'Unused optional peer dependencies',
        fix: 'Declared as an optional peer, imported nowhere. Drop it from the manifest.',
    },
};

/**
 * Reported by `--all`, never gated. Not dead code — drift, resolution failures,
 * and one design smell. The header says why each is out.
 */
const UNGATED = ['unlisted', 'binaries', 'unresolved', 'cycles', 'catalog', 'catalogReferences'];

/**
 * Max findings per category. The backlog is cleared — every one of these is at 0
 * and stays there. Never raise one to land a change; delete the dead thing.
 */
const BUDGET = Object.fromEntries(Object.keys(CATEGORIES).map((key) => [key, 0]));

const bin = path.resolve(ROOT, 'node_modules/.bin/knip');

/**
 * knip only reports the issue types it is asked for, and several of the ones
 * this gate counts (`nsExports`, `duplicates`, `enumMembers`, …) are off by
 * default. Naming them explicitly — rather than taking the default set minus an
 * exclude list — is what keeps CATEGORIES and the CLI in step: add a key there
 * and it is asked for here, with no second list to forget.
 */
const GATED = Object.keys(CATEGORIES);

/**
 * `--all` is the human-facing view, not a stricter gate: hand the terminal
 * straight to knip so you get every category it knows about — including the
 * `unlisted` / `cycles` ones this gate deliberately does not fail on — in its
 * own formatting, with no budgets applied.
 */
if (process.argv.includes('--all')) {
    try {
        const argv = ['--no-progress', '--tags=-public', '--include', [...GATED, ...UNGATED].join(',')];
        execFileSync(bin, argv, { cwd: ROOT, stdio: 'inherit' });
    } catch {
        /* Findings make knip exit non-zero; in this mode we are only reporting. */
    }
    process.exit(0);
}

const args = ['--no-progress', '--reporter', 'json', '--tags=-public', '--include', GATED.join(',')];

let raw;
try {
    raw = execFileSync(bin, args, {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
    });
} catch (err) {
    raw = err.stdout ?? '';
    if (!raw.trim()) {
        console.error('✖ check-dead-code: knip produced no output. Is `knip` installed?');
        if (err.stderr) console.error(err.stderr.toString().trim());
        process.exit(1);
    }
}

let report;
try {
    report = JSON.parse(raw);
} catch {
    console.error("✖ check-dead-code: could not parse knip's JSON report.");
    console.error(raw.slice(0, 500));
    process.exit(1);
}

const found = Object.fromEntries(GATED.map((key) => [key, []]));
for (const entry of report.issues ?? []) {
    for (const category of GATED) {
        for (const item of entry[category] ?? []) {
            found[category].push(
                Array.isArray(item)
                    ? { file: entry.file, name: item.map((symbol) => symbol.name).join(' = '), line: item[0]?.line }
                    : { file: entry.file, name: item.name, line: item.line },
            );
        }
    }
}

const where = ({ file, name, line }) => (name === file ? file : `${file}${line ? `:${line}` : ''} — ${name}`);

let failed = false;

for (const [category, { label, fix }] of Object.entries(CATEGORIES)) {
    const hits = found[category];
    if (hits.length <= BUDGET[category]) continue;

    failed = true;
    console.error(`\n✖ ${label}: ${hits.length} exceeds the budget of ${BUDGET[category]}.\n`);
    for (const hit of hits.sort((a, b) => a.file.localeCompare(b.file))) {
        console.error(`  • ${where(hit)}`);
    }
    console.error(`\n    → ${fix}\n`);
}

if (failed) {
    console.error(
        'Budgets live in scripts/checks/check-dead-code.mjs and only ever go down.\n' +
            'If an export is public by design, tag it `/** @public */` rather than raising one.\n',
    );
    process.exit(1);
}

console.log(`✔ No dead code — ${GATED.length} categories, all at 0.`);
console.log(
    '\nNot machine-checked: code reachable from an entry point but never reached at RUNTIME — a route nothing links to, a branch no config enables, a Redis channel with no publisher.',
);

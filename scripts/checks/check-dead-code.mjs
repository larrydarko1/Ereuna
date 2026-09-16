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
 *   testOnlyExports — the second pass, and the only synthetic category here.
 *              knip's default run counts a test file as a consumer, so an export
 *              nothing but its own test imports looks alive — a fully tested
 *              symbol wired into nothing passes this gate. Running again under
 *              `--production` drops test files from the graph entirely and
 *              reports what is left, minus whatever the first pass already
 *              named, so each finding is reported once. Four different things
 *              land here and they do NOT share a fix, which is why nothing about
 *              this is automatic: production code nobody wired (delete it, or
 *              wire it), a symbol the module genuinely publishes
 *              (`/** @public *\/`), an implementation detail the test reached
 *              past the front door for (unexport, test it through the caller),
 *              and an expected value the test imported instead of writing down.
 *              That last one is the reason to care: an assertion fed from the
 *              same constant the code under test builds its answer from is
 *              `x === x` and cannot fail. Sharing a constant with the subject
 *              does not keep the test in sync — it stops the test noticing.
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
 *
 * The charting fork under `frontend/src/lib/` is NOT excluded. It is this app's
 * own code, so an export nothing imports is dead here exactly as it is anywhere
 * else — and a fork is precisely where unreachable code accumulates, because
 * upstream's public API is this codebase's internals.
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
 * The second pass, keyed separately because `testOnlyExports` is this gate's own
 * word, not a knip issue type — it cannot be asked for on the CLI and it cannot
 * sit in CATEGORIES, which doubles as the `--include` list.
 * `PROD_INCLUDE` is CATEGORIES minus `files` and the three dependency
 * categories: under `--production` the test files leave the graph, so `vitest`
 * and every test helper become "unused" and the run would be nothing but noise.
 * Exports are the only thing this pass has a real claim to.
 */
const TEST_ONLY = {
    key: 'testOnlyExports',
    label: 'Exports used only by tests',
    fix: "Production code never imports this; only a test does. Decide which of the four it is: unwired production code (delete it, or wire it), a real part of the module's contract (tag `/** @public */`), an internal reached past the front door (unexport, and test it through the caller that uses it), or an expected value the test should write down as a literal instead of importing (an assertion fed from the code under test cannot fail).",
};

const PROD_INCLUDE = ['exports', 'types', 'nsExports', 'nsTypes', 'namespaceMembers', 'enumMembers'];

const PROD_ARGS = ['--production', '--include-entry-exports'];

/**
 * Reported by `--all`, never gated. Not dead code — drift, resolution failures,
 * and one design smell. The header says why each is out.
 */
const UNGATED = ['unlisted', 'binaries', 'unresolved', 'cycles', 'catalog', 'catalogReferences'];

/**
 * Max findings per category. The backlog is cleared — every one of these is at 0
 * and stays there. Never raise one to land a change; delete the dead thing.
 */
const BUDGET = Object.fromEntries([...Object.keys(CATEGORIES), TEST_ONLY.key].map((key) => [key, 0]));

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

/** One knip run, bucketed by category. `extra` is what separates the two passes. */
function knip(include, extra = []) {
    const args = ['--no-progress', '--reporter', 'json', '--tags=-public', '--include', include.join(','), ...extra];

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

    const found = Object.fromEntries(include.map((key) => [key, []]));
    for (const entry of report.issues ?? []) {
        for (const category of include) {
            for (const item of entry[category] ?? []) {
                found[category].push(
                    Array.isArray(item)
                        ? { file: entry.file, name: item.map((symbol) => symbol.name).join(' = '), line: item[0]?.line }
                        : { file: entry.file, name: item.name, line: item.line },
                );
            }
        }
    }
    return found;
}

const found = knip(GATED);

/**
 * Pass two. Anything the first pass already named is dead outright and is
 * reported there; the remainder is alive only because a test imports it.
 */
const id = ({ file, name }) => `${file}::${name}`;
const alreadyReported = new Set(Object.values(found).flat().map(id));
found[TEST_ONLY.key] = Object.values(knip(PROD_INCLUDE, PROD_ARGS))
    .flat()
    .filter((hit) => !alreadyReported.has(id(hit)));

const where = ({ file, name, line }) => (name === file ? file : `${file}${line ? `:${line}` : ''} — ${name}`);

let failed = false;

const REPORTED = [...Object.entries(CATEGORIES), [TEST_ONLY.key, TEST_ONLY]];

for (const [category, { label, fix }] of REPORTED) {
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

console.log(`✔ No dead code — ${GATED.length + 1} categories, all at 0.`);
console.log(
    '\nNot machine-checked: code reachable from an entry point but never reached at RUNTIME — a route nothing links to, a branch no config enables, a Redis channel with no publisher.',
);

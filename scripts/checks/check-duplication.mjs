#!/usr/bin/env node
/**
 * Duplication (DRY) gate.
 * The failure this is for is the one refactoring keeps producing here: a
 * service is split into per-concern files, the same guard or the same mapping
 * is pasted into each of them, and every subsequent fix lands in one copy. It
 * is invisible in a diff because no single diff contains both halves.
 * Every source tree is scanned in ONE jscpd run rather than one run per
 * workspace, because the clones that matter most here cross a workspace
 * boundary — a DTO restated in `frontend/src/api/` against the service that
 * produces it, or the Mongo bootstrap duplicated between ingestor and worker.
 * A per-workspace run cannot see either. That is what `--absolute` buys: with
 * several scan roots jscpd reports a path relative to whichever root matched,
 * so `lib/db.ts` and `lib/db.ts` would be two indistinguishable names.
 * GATED ON TYPESCRIPT ONLY, and the rest is a recorded decision, not an
 * oversight:
 *   - SCSS sits around 8%, and most of it is the same handful of declarations
 *     inside different SFCs. `@extend` cannot cross the SFC boundary in this
 *     codebase, so de-duplicating those means promoting each one to a real
 *     global class in `styles/components/` — a design call about what deserves
 *     to be shared, not something a percentage should force.
 *   - The `html` figure is the `<template>` half of the SFCs, where repetition
 *     is markup structure rather than logic.
 *   Both are still printed by `npm run lint:dup`.
 * Three checks run on that report: the overall percentage, any block copied
 * between two workspaces (fails at any size), and any exported type name
 * declared in two workspaces (the shape belongs in packages/shared).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

/** Every source tree in the monorepo, the charting fork included. */
const SCAN = ['frontend/src', 'api/src', 'worker/src', 'ingestor/src', 'packages/shared/src'];
const THRESHOLD = 5;

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jscpd-'));
const bin = path.resolve(ROOT, 'node_modules/.bin/jscpd');

try {
    execFileSync(bin, [...SCAN, '--config', '.jscpd.json', '--absolute', '--reporters', 'json', '--output', outDir], {
        cwd: ROOT,
        stdio: 'ignore',
    });
} catch {
    /* jscpd exits non-zero only on its own errors; the JSON report is still written. */
}

const reportPath = path.join(outDir, 'jscpd-report.json');
if (!fs.existsSync(reportPath)) {
    console.error('✖ check-duplication: jscpd produced no report. Is `jscpd` installed?');
    process.exit(1);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
fs.rmSync(outDir, { recursive: true, force: true });

const pct = report.statistics.formats.typescript?.percentageTokens ?? 0;
const clones = report.duplicates.filter((clone) => clone.format === 'typescript').sort((a, b) => b.tokens - a.tokens);

/** `--absolute` gives a full path, and the `:typescript` suffix marks an SFC's script block. */
const rel = (file) => path.relative(ROOT, file.replace(/:typescript$/, ''));
const loc = (file) => `${rel(file.name)}:${file.start}-${file.end}`;
const workspaceOf = (file) => SCAN.find((root) => rel(file).startsWith(`${root}/`));
const printClones = (list) => {
    for (const clone of list) {
        console.error(`  • ${clone.lines} lines / ${clone.tokens} tokens`);
        console.error(`      ${loc(clone.firstFile)}`);
        console.error(`      ${loc(clone.secondFile)}`);
    }
};

let failed = false;

// 1. Overall copy-paste stays under the threshold.
if (pct > THRESHOLD) {
    failed = true;
    console.error(`\n✖ Logic duplication ${pct.toFixed(1)}% exceeds the ${THRESHOLD}% threshold.\n`);
    console.error('Copy-pasted blocks — extract each into a shared module:\n');
    printClones(clones);
}

// 2. No block copy-pasted between workspaces, whatever the percentage — each is
//    two copies of one piece of logic, and a fix lands in only one of them.
const crossClones = clones.filter((clone) => workspaceOf(clone.firstFile.name) !== workspaceOf(clone.secondFile.name));
if (crossClones.length > 0) {
    failed = true;
    console.error(`\n✖ ${crossClones.length} block(s) copy-pasted between workspaces — move each into packages/shared:\n`);
    printClones(crossClones);
}

// 3. No exported type name declared in two workspaces. A shape both sides use
//    lives in packages/shared, or the two copies drift apart.
function listSourceFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return ['__tests__', 'node_modules', 'dist'].includes(entry.name) ? [] : listSourceFiles(full);
        }
        const isSource = /\.(ts|vue)$/.test(entry.name) && !/\.(test|spec)\.ts$|\.d\.ts$/.test(entry.name);
        return isSource ? [full] : [];
    });
}

const declarations = new Map();
for (const root of SCAN) {
    for (const file of listSourceFiles(path.join(ROOT, root))) {
        const src = fs.readFileSync(file, 'utf8');
        for (const match of src.matchAll(/^export\s+(?:type|interface)\s+([A-Z]\w*)/gm)) {
            const line = src.slice(0, match.index).split('\n').length;
            const defs = declarations.get(match[1]) ?? [];
            defs.push({ root, where: `${rel(file)}:${line}` });
            declarations.set(match[1], defs);
        }
    }
}
const driftingTypes = [...declarations].filter(([, defs]) => new Set(defs.map((def) => def.root)).size > 1);
if (driftingTypes.length > 0) {
    failed = true;
    console.error(
        `\n✖ ${driftingTypes.length} type name(s) declared in more than one workspace — keep one copy in packages/shared and import it:\n`,
    );
    for (const [name, defs] of driftingTypes) {
        console.error(`  • ${name}`);
        for (const def of defs) console.error(`      ${def.where}`);
    }
}

if (failed) {
    console.error('\nFull report (incl. SCSS/HTML): npm run lint:dup\n');
    process.exit(1);
}

console.log(
    `✔ Logic duplication ${pct.toFixed(1)}% (threshold ${THRESHOLD}%); no cross-workspace copies or types.` +
        (clones.length ? ` ${clones.length} clone(s) below the gate — see \`npm run lint:dup\`.` : ''),
);

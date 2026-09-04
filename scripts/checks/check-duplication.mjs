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
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

/** Every source tree in the monorepo. The vendored chart fork is excluded in .jscpd.json. */
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
const loc = (file) => `${path.relative(ROOT, file.name.replace(/:typescript$/, ''))}:${file.start}-${file.end}`;

if (pct > THRESHOLD) {
    console.error(`\n✖ Logic duplication ${pct.toFixed(1)}% exceeds the ${THRESHOLD}% threshold.\n`);
    console.error('Copy-pasted blocks — extract each into a shared module:\n');
    for (const clone of clones) {
        console.error(`  • ${clone.lines} lines / ${clone.tokens} tokens`);
        console.error(`      ${loc(clone.firstFile)}`);
        console.error(`      ${loc(clone.secondFile)}`);
    }
    console.error('\nFull report (incl. SCSS/HTML): npm run lint:dup\n');
    process.exit(1);
}

console.log(
    `✔ Logic duplication ${pct.toFixed(1)}% (threshold ${THRESHOLD}%).` +
        (clones.length ? ` ${clones.length} clone(s) below the gate — see \`npm run lint:dup\`.` : ''),
);

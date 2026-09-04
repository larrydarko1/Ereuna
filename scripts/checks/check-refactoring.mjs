#!/usr/bin/env node
/**
 * Refactoring & change-management gate (refactoring.instructions.md).
 * Deferred work does not live in the code. A `TODO` is a promise nobody is
 * tracking: it survives review because it reads as diligence, and it outlives
 * its own deferral because nothing ever re-reads it. `(TBD)` once sat in a
 * header describing two stylesheets as unwritten while both were hundreds of
 * lines long and imported by the file the note was in — that is the failure
 * mode exactly.
 * SCOPE. Every text file the repo tracks, of any type. Lotus splits this with
 * ESLint's `no-warning-comments` covering everything it can parse and the gate
 * taking the rest; there is no ESLint here yet, so this gate takes all of it,
 * and the split can be restored when ESLint lands.
 * Two things are deliberately NOT checked:
 *   - Whether todo.md's items carry checkboxes. This repo's tracker is prose
 *     grouped by batch, not a task list, and imposing `- [ ]` on 170 bullets
 *     would be a formatting rule pretending to be a process rule.
 *   - PR composition. Nothing in a working tree records how a change was split.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

/** Deferral markers, shouted. */
const MARKERS = /\b(TODO|FIXME|FIX ME|HACK|XXX|TBD|WIP)\b/;

/**
 * Binary or generated files, plus two exemptions that are not evasions:
 * `todo.md` is the destination the ban points at, so flagging it for containing
 * the word would read the standard exactly backwards — and this file is the one
 * that spells the markers out, so it necessarily contains every one of them.
 */
const SKIP = new Set(['package-lock.json', 'todo.md', 'check-refactoring.mjs']);
const SKIP_PATTERN = /^(node_modules|.*\/node_modules|.*\/dist|coverage|.*\/coverage|frontend\/src\/lib\/lightweight-charts)\//;
const BINARY = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf|zip|gz)$/i;

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });

/**
 * Tracked AND untracked-but-not-ignored, so a file added in this working tree
 * is checked before it is committed rather than after. `git ls-files` alone
 * lists what is already staged or committed, which is one commit too late.
 */
const repoFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
})
    .split('\n')
    .filter(Boolean);

// ── 1. Deferral markers ─────────────────────────────────────────────────────
let scanned = 0;
for (const rel of repoFiles) {
    if (SKIP.has(path.basename(rel)) || SKIP_PATTERN.test(rel) || BINARY.test(rel)) continue;

    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size > 512 * 1024) continue;

    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes('\0')) continue;
    scanned++;

    text.split('\n').forEach((line, i) => {
        const hit = MARKERS.exec(line);
        if (hit === null) return;
        fail(
            `${rel}:${i + 1}`,
            `\`${hit[1]}\` marker — ${line.trim().slice(0, 80)}`,
            'Deferred work does not live in the code. Move it to todo.md at the repo root and delete the marker. If the line describes something that is TRUE now rather than something outstanding, say it as a statement — the marker is what turns an observation into a promise nobody is tracking.',
        );
    });
}

// ── 2. The destination ──────────────────────────────────────────────────────
const TODO_FILE = path.join(ROOT, 'todo.md');
const hasTracker = fs.existsSync(TODO_FILE);
let items = 0;

if (hasTracker) {
    const lines = fs.readFileSync(TODO_FILE, 'utf8').split('\n');
    if (lines.every((l) => l.trim() === '')) {
        fail(
            'todo.md',
            'is empty',
            'It is the destination the marker ban points at. An empty tracker in a repo that forbids TODO comments means deferred work is being dropped, not deferred.',
        );
    }
    items = lines.filter((l) => /^\s*[-*]\s/.test(l)).length;
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} refactoring / change-management violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See refactoring.instructions.md, then re-run.');
    process.exit(1);
}

console.log(`✓ Refactoring OK — no deferral markers in ${scanned} tracked text file(s).`);
console.log(
    hasTracker
        ? `  todo.md: ${items} tracked item(s).`
        : '  todo.md: not present in this checkout — the destination check was skipped.',
);
console.log(
    '\nNot machine-checked: whether a change was in scope, whether a drive-by belonged in its own commit, whether a file was split by concern or by line count, whether something deferred should have been fixed on the spot.',
);

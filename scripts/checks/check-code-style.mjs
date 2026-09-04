#!/usr/bin/env node
/**
 * Code style gate (code-style.instructions.md).
 *   1. FILENAME CASING. kebab-case across every backend source root, and under
 *      services/, lib/ and routes/ anywhere else. Composables (`useThing.ts`)
 *      and SFCs (`PascalCase.vue`) are the two named exceptions and live
 *      outside those directories, so the rule can be flat. Casing drift is
 *      invisible in a diff — you read the import line, not the convention it
 *      broke — and the cost of the rename grows with every new importer.
 *   2. THE ~400-LINE SOFTCAP, AS A RATCHET. The standard says the cap is soft,
 *      so failing every file over it would be a refactor backlog wearing a red
 *      X. The files already over it are listed below at the size they were, and
 *      the gate fails only when a new file crosses the line or a listed one
 *      grows. A soft target that can only move one way.
 *   3. PUBLIC BEFORE PRIVATE. The ordering table's second rule. Comments are
 *      stripped first, so a disabled handler quoted inside a block comment is
 *      not read as a private function stranded above the public API.
 *   4. HEADERS BY FILE TYPE. lib/ and middleware/ owe a JSDoc block, services/
 *      at least a one-line `//`, frontend api/ modules a line naming the domain
 *      they wrap — and Vue SFCs none at all, because `defineProps` is the
 *      contract. That last one is a BAN, and bans are what nothing else catches.
 *   5. COMMENT FORMAT IN `<template>` AND `<style>`. Plain `<!-- Section -->` in
 *      markup, the decorated divider in styles, and no inline comments inside a
 *      style rule. The formats are what make them scannable.
 *   6. NO JSDoc TYPE TAGS IN TYPESCRIPT. `@param {string}` restates what the
 *      signature already says and, unlike the signature, is never checked.
 *   7. SFC BLOCK ORDER. `<script setup>` → `<template>` → `<style scoped>`, with
 *      no exceptions. Vue compiles any order, so nothing but a sweep notices.
 *   8. NO RELATIVE IMPORTS where `@/` resolves. A relative specifier still works,
 *      which is why it spreads: it only becomes a problem when the file moves.
 *      packages/shared is excluded — it declares no alias, so relative is right
 *      there.
 * The vendored lightweight-charts fork under frontend/src/lib is excluded whole:
 * it is upstream code held frozen, and every rule here is about how THIS
 * codebase is written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';
import { stripComments } from '../lib/strip-comments.mjs';

const SOURCE_ROOTS = ['api/src', 'worker/src', 'ingestor/src', 'frontend/src', 'packages/shared/src'];
const ALIASED_ROOTS = ['api/src', 'worker/src', 'ingestor/src', 'frontend/src'];
const VENDORED = ['frontend/src/lib/lightweight-charts/'];
const LINE_CAP = 400;

/** Files over the softcap when the gate was written. Lower a number, never raise it. */
const LENGTH_BASELINE = {
    'frontend/src/components/charts/PriceChart.vue': 705,
};

const CASING_EXEMPT = /^(index|App)$/;

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const allFiles = SOURCE_ROOTS.flatMap((root) => walk(root)).filter((f) => !VENDORED.some((v) => f.startsWith(v)));
const sourceTs = allFiles.filter((f) => f.endsWith('.ts') && !isSpec(f) && !f.endsWith('.d.ts'));
const sourceVue = allFiles.filter((f) => f.endsWith('.vue'));

// ── 1. Filename casing ──────────────────────────────────────────────────────
for (const rel of allFiles.filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))) {
    const backend = /^(api|worker|ingestor|packages\/shared)\/src\//.test(rel);
    if (!backend && !/\/(services|lib|routes)\//.test(rel)) continue;
    const base = path.basename(rel, '.ts').replace(/\.test$/, '');
    if (CASING_EXEMPT.test(base)) continue;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(base)) {
        fail(
            rel,
            `filename \`${base}\` is not kebab-case`,
            'Every backend source root — and services/, lib/, routes/ anywhere — uses kebab-case. Rename the file and its importers together, MODULE SPECIFIERS ONLY: rewriting the exported symbol at the same time is how a rename turns into a diff nobody can review.',
        );
    }
}

// ── 2. File length, ratcheted ───────────────────────────────────────────────
for (const rel of [...sourceTs, ...sourceVue]) {
    const size = codeLines(rel);
    const baseline = LENGTH_BASELINE[rel];
    if (baseline === undefined) {
        if (size > LINE_CAP) {
            fail(
                rel,
                `${size} lines, over the ~${LINE_CAP}-line softcap`,
                'Split it. If it genuinely cannot be split, add it to LENGTH_BASELINE in this gate with a reason — that is a decision worth making out loud.',
            );
        }
    } else if (size > baseline) {
        fail(
            rel,
            `grew to ${size} lines (was ${baseline}, already over the ~${LINE_CAP} softcap)`,
            'This file is on the split-me list. It may shrink, not grow — lower the number in LENGTH_BASELINE, never raise it.',
        );
    } else if (size <= LINE_CAP) {
        fail(
            rel,
            `is down to ${size} lines and no longer needs a baseline entry`,
            'Remove it from LENGTH_BASELINE so the ratchet cannot quietly slip back.',
        );
    }
}

// ── 3. Public before private ────────────────────────────────────────────────
for (const rel of sourceTs) {
    const lines = stripComments(read(rel)).split('\n');
    const firstPrivate = lines.findIndex((l) => /^(async )?function \w/.test(l));
    if (firstPrivate === -1) continue;
    const lastPublic = lines.reduce((acc, l, i) => (/^export (async )?function \w/.test(l) ? i : acc), -1);
    if (lastPublic > firstPrivate) {
        fail(
            rel,
            `an exported function is declared below a private one (line ${lastPublic + 1} after line ${firstPrivate + 1})`,
            'Public API first, implementation after. The exported functions are the headline — a reader should not have to scroll past helpers to find them.',
        );
    }
}

// ── 4. Headers, by file type ────────────────────────────────────────────────
for (const rel of sourceTs.filter((f) => /\/(lib|middleware)\//.test(f))) {
    if (!read(rel).startsWith('/**')) {
        fail(rel, 'no JSDoc file header', 'lib/ and middleware/ modules open with a JSDoc block: what the module owns, and any decision a reader would otherwise have to reverse-engineer.');
    }
}
for (const rel of sourceTs.filter((f) => /\/services\//.test(f))) {
    const src = read(rel);
    if (!src.startsWith('/**') && !src.startsWith('//')) {
        fail(rel, 'no file header', 'A service states what it owns — a JSDoc block for a domain owner, one `//` line for a narrow sub-module.');
    }
}
for (const rel of allFiles.filter((f) => f.startsWith('frontend/src/api/') && f.endsWith('.ts') && !isSpec(f))) {
    const src = read(rel);
    if (!src.startsWith('//') && !src.startsWith('/**')) {
        fail(rel, 'no header', 'Frontend api/ modules open with `// domain — API wrappers for /api/…`, naming the prefix they wrap.');
    }
}
for (const rel of sourceVue) {
    if (/^\s*(<!--|\/\*)/.test(read(rel))) {
        fail(rel, 'has a file-level header comment', 'Vue SFCs take no file header — defineProps is the contract. Put the "why" next to the code it explains.');
    }
}

// ── 5. Comment format in <template> and <style> ─────────────────────────────
for (const rel of sourceVue) {
    const template = /<template>([\s\S]*)<\/template>/.exec(read(rel))?.[1] ?? '';
    for (const [, body] of template.matchAll(/<!--([\s\S]*?)-->/g)) {
        if (/[–—─]{2,}/.test(body)) {
            fail(
                rel,
                `decorated template comment: <!--${body.replace(/\s+/g, ' ').slice(0, 40)}… -->`,
                'Template section labels are plain text: `<!-- Section name -->`. The dashed form is the SCSS divider style.',
            );
        }
    }
}
for (const rel of [...sourceVue, ...allFiles.filter((f) => f.endsWith('.scss'))]) {
    const src = read(rel);
    const style = rel.endsWith('.vue') ? (src.match(/<style[\s\S]*?<\/style>/g) ?? []).join('\n') : src.replace(/^\/\*[\s\S]*?\*\//, '');
    const globalSheet = rel.endsWith('.scss');
    for (const [whole, body] of style.matchAll(/\/\*([\s\S]*?)\*\//g)) {
        const text = body.trim();
        if (text.startsWith('stylelint-')) continue;
        if (globalSheet && whole.startsWith('/**')) continue;
        if (!/^–{2,}\s+\S[\s\S]*\S\s+–{2,}$/.test(text)) {
            fail(
                rel,
                `non-divider style comment: /* ${text.replace(/\s+/g, ' ').slice(0, 45)} */`,
                'Style blocks carry section dividers only — `/* –––––– Section name –––––– */`, en-dashes, sentence case. An explanation of a property belongs in the markup, not the stylesheet.',
            );
        }
    }
}

// ── 6. No JSDoc type tags in TypeScript ─────────────────────────────────────
for (const rel of [...sourceTs, ...sourceVue]) {
    for (const [, tag] of read(rel).matchAll(/@(param|returns|type)\s*\{/g)) {
        fail(
            rel,
            `\`@${tag} {…}\` carries a type`,
            'TypeScript already states the type and actually checks it. Drop the braces — keep the prose if it says something the signature cannot.',
        );
    }
}

// ── 7. SFC block order ──────────────────────────────────────────────────────
for (const rel of sourceVue) {
    const src = read(rel);
    const seen = [];
    for (const [, tag] of src.matchAll(/^<(script|template|style)\b/gm)) seen.push(tag);
    const expected = ['script', 'template', 'style'];
    const ordered = seen.filter((t, i) => seen.indexOf(t) === i);
    const canonical = expected.filter((t) => ordered.includes(t));
    if (ordered.join(',') !== canonical.join(',')) {
        fail(
            rel,
            `blocks are ordered ${ordered.join(' → ')}`,
            'SFC block order is `<script setup lang="ts">` → `<template>` → `<style scoped lang="scss">`. No exceptions — Vue compiles any order, so only a sweep notices.',
        );
    }
    const script = /<script\b([^>]*)>/.exec(src)?.[1] ?? '';
    if (script !== '' && !(script.includes('setup') && script.includes('lang="ts"'))) {
        fail(rel, `<script${script}> is not \`<script setup lang="ts">\``, 'Every SFC in this codebase is script-setup TypeScript.');
    }
    const style = /<style\b([^>]*)>/.exec(src)?.[1] ?? '';
    if (style !== '' && !(style.includes('scoped') && style.includes('lang="scss"'))) {
        fail(rel, `<style${style}> is not \`<style scoped lang="scss">\``, 'Component styles are scoped SCSS. Anything that has to cross the SFC boundary is a real global class in styles/components/, never an unscoped block here.');
    }
}

// ── 8. No relative imports where @/ resolves ────────────────────────────────
for (const rel of [...sourceTs, ...sourceVue].filter((f) => ALIASED_ROOTS.some((r) => f.startsWith(`${r}/`)))) {
    const src = stripComments(read(rel));
    for (const [, spec] of src.matchAll(/(?:from|import)\s*['"](\.[^'"]*)['"]/g)) {
        fail(
            rel,
            `relative import \`${spec}\``,
            'Imports always use `@/`. A relative specifier works right up until the file moves, and then it fails somewhere else.',
        );
    }
}

function isSpec(rel) {
    return rel.includes('__tests__') || /\.(test|spec)\.ts$/.test(rel);
}

function codeLines(rel) {
    const src = read(rel);
    const body = rel.endsWith('.vue') ? src.replace(/<style[\s\S]*?<\/style>/g, '') : src;
    return body.split('\n').filter((l) => l.trim() !== '').length;
}

function walk(rel, out = []) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) walk(child, out);
        else out.push(child);
    }
    return out;
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} code style violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See code-style.instructions.md, then re-run.');
    process.exit(1);
}

const over = Object.keys(LENGTH_BASELINE).length;
console.log(
    `✓ Code style OK — ${sourceTs.length + sourceVue.length} source files: names kebab-cased across the backend and under services/lib/routes, public API above private helpers, headers present per file type, template and style comments in their own formats, no JSDoc types, SFC blocks in order, no relative imports.`,
);
console.log(`  File length: ${over} file(s) over the ~${LINE_CAP}-line softcap, all baselined and ratcheted — they can shrink, not grow.`);
console.log(
    '\nNot machine-checked: whether a comment explains WHY rather than what, whether a header earns its place, whether a file really is one concern, whether a name means anything beyond being long enough.',
);

#!/usr/bin/env node
/**
 * i18n locale consistency gate.
 *   0. Key parity            — every key in every locale, both directions. The
 *                              house rule is that adding a key means adding it
 *                              18 times; a key present only in `en` renders as
 *                              its own dotted path to everyone else, and a key
 *                              only in `fr` is a translation of something that
 *                              no longer exists. Both are invisible in review.
 *   1. Plural-segment parity   — "a | b" must have the same number of `|` segments
 *                                in every locale, or vue-i18n pluralization breaks.
 *                                (valid-plural-forms checks each file is WELL-FORMED;
 *                                only this can check they AGREE with each other.)
 *   2. Placeholder parity      — the set of {named} interpolation tokens must match
 *                                across locales (order may differ — word order is
 *                                language-specific — but the set must be identical).
 *                                A translator dropping `{count}` yields a message
 *                                that renders, and silently loses the number.
 *   3. Array-length parity     — array-valued keys (e.g. report reasons) must have
 *                                the same length in every locale, or the UI renders
 *                                a different number of options per language.
 *   4. createI18n options      — `escapeParameter`, `legacy` and `fallbackLocale`
 *                                in frontend/src/i18n.ts. No i18n rule reads that
 *                                file, and escapeParameter in particular is a
 *                                security control (see the check below).
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const LOCALE_DIR = path.resolve(ROOT, 'frontend/src/locales');
const I18N_CONFIG = path.resolve(ROOT, 'frontend/src/i18n.ts');
const REFERENCE = 'en';

/** ISO 639-1 codes, so browser detection stays a prefix match. */
const LOCALE_CODE = /^[a-z]{2}$/;

function flatten(node, prefix = '', out = {}) {
    if (Array.isArray(node)) {
        out[`${prefix}[]`] = `__array:${node.length}`;
        node.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            flatten(v, prefix ? `${prefix}.${k}` : k, out);
        }
    } else if (typeof node === 'string') {
        out[prefix] = node;
    }
    return out;
}

function placeholders(str) {
    return [...new Set((str.match(/\{[^}]+\}/g) || []).filter((t) => t !== "{'@'}"))].sort();
}

function pluralSegments(str) {
    return str.split('|').length;
}

const files = fs
    .readdirSync(LOCALE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));

if (!files.includes(REFERENCE)) {
    console.error(`✗ Reference locale "${REFERENCE}.json" not found in ${LOCALE_DIR}`);
    process.exit(1);
}

const flat = {};
for (const loc of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, `${loc}.json`), 'utf8'));
    flat[loc] = flatten(raw);
}

const ref = flat[REFERENCE];
const others = files.filter((l) => l !== REFERENCE);
const errors = [];

// ── 0. Key parity, both directions ──────────────────────────────────────────
const refKeys = new Set(Object.keys(ref));
for (const loc of others) {
    const curKeys = new Set(Object.keys(flat[loc]));
    const missing = [...refKeys].filter((k) => !curKeys.has(k));
    const extra = [...curKeys].filter((k) => !refKeys.has(k));
    for (const key of missing) errors.push(`[${loc}] ${key}: missing — present in ${REFERENCE}, absent here`);
    for (const key of extra) errors.push(`[${loc}] ${key}: orphaned — not in ${REFERENCE}, so nothing ever reads it`);
}

for (const loc of files) {
    if (!LOCALE_CODE.test(loc)) errors.push(`[${loc}] filename is not a two-letter ISO 639-1 code — browser detection matches on a two-character prefix`);
}

// ── 1–3. Cross-locale value-shape parity vs the reference locale ─────────────
for (const loc of others) {
    const cur = flat[loc];
    for (const [key, refVal] of Object.entries(ref)) {
        const curVal = cur[key];
        if (curVal === undefined) continue; 

        if (typeof refVal === 'string' && refVal.startsWith('__array:')) {
            if (curVal !== refVal) {
                errors.push(`[${loc}] ${key}: array length ${curVal.split(':')[1]} ≠ en ${refVal.split(':')[1]}`);
            }
            continue;
        }

        const rp = pluralSegments(refVal);
        const cp = pluralSegments(curVal);
        if (rp !== cp) {
            errors.push(`[${loc}] ${key}: ${cp} plural segment(s) ≠ en ${rp} — "${curVal}"`);
        }

        const rph = placeholders(refVal).join(',');
        const cph = placeholders(curVal).join(',');
        if (rph !== cph) {
            errors.push(`[${loc}] ${key}: placeholders [${cph}] ≠ en [${rph}]`);
        }
    }
}

// ── 4. createI18n options ────────────────────────────────────────────────────
const i18nSource = fs.readFileSync(I18N_CONFIG, 'utf8');

const REQUIRED_OPTIONS = [
    {
        what: 'escapeParameter: true',
        re: /escapeParameter:\s*true/,
        why:
            'SECURITY. Interpolation params are values from outside the dictionary — usernames, titles, filenames. ' +
            'With escapeParameter off, a param carrying markup is injected unescaped wherever the message is ' +
            'rendered as HTML, turning a translated string into an XSS sink.',
    },
    {
        what: 'legacy: false',
        re: /legacy:\s*false/,
        why: 'Composition API mode. The legacy (Options API) mode installs a different, global `$t` and silently changes how `useI18n()` resolves scope.',
    },
    {
        what: 'fallbackLocale',
        re: /fallbackLocale:/,
        why: 'Without a fallback, a key missing from the active locale renders as the raw key path to the user.',
    },
];

for (const { what, re, why } of REQUIRED_OPTIONS) {
    if (!re.test(i18nSource)) {
        errors.push(`[frontend/src/i18n.ts] createI18n is missing \`${what}\` — ${why}`);
    }
}

// ── Report ───────────────────────────────────────────────────────────────────
const refKeyCount = Object.keys(ref).filter((k) => !k.endsWith('[]')).length;
if (errors.length) {
    console.error(`✗ i18n check failed — ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ${e}`);
    console.error(`\nLocales checked: ${files.join(', ')} (${refKeyCount} keys, ${REFERENCE} = reference)`);
    process.exit(1);
}

console.log(
    `✓ i18n check passed — ${files.length} locales, ${refKeyCount} keys, plural/placeholder/array shapes consistent, createI18n options intact.`,
);

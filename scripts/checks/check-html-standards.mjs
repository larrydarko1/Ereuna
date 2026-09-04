#!/usr/bin/env node
/**
 * Document-level HTML standards gate.
 *   1. THE DOCUMENT SHELL. `frontend/index.html` is the one file ESLint's Vue
 *      parser never reads — no rule can assert the required meta tags exist.
 *   2. THE ENTRY MODULE RESOLVES. `<script type="module" src="…">` is the one
 *      import in the app that no compiler checks: Vite rewrites it at build
 *      time, and a src pointing at a file that does not exist is a blank page.
 *   3. THE REDUCED-MOTION ESCAPE HATCH. ~220 transition/animation declarations
 *      are spread across components; the single global override that honours
 *      `prefers-reduced-motion` is what makes all of them safe. Stylelint can
 *      police how a rule is written but not that a rule still EXISTS, and its
 *      deletion would be silent and invisible in review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const INDEX_HTML = 'frontend/index.html';
const BASE_SCSS = 'frontend/src/styles/_base.scss';

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });

// ── 1. Document shell ───────────────────────────────────────────────────────
const html = fs.readFileSync(path.join(ROOT, INDEX_HTML), 'utf8');

/** Required <meta>/<link>/attribute presence, as a matcher per requirement. */
const REQUIRED_HEAD = [
    { what: '<html lang="…">', re: /<html[^>]+\blang="[a-z]{2}[^"]*"/i, why: 'Screen readers pick pronunciation from it on load.' },
    { what: '<meta charset>', re: /<meta[^>]+charset=/i, why: 'Without it the browser guesses the encoding.' },
    { what: '<meta name="viewport">', re: /<meta[^>]+name="viewport"/i, why: 'Mobile layout collapses to a desktop viewport without it.' },
    { what: '<title>', re: /<title>[^<]+<\/title>/i, why: 'The tab name and the first thing a screen reader announces.' },
    { what: '<meta name="description">', re: /<meta[^>]+name="description"[^>]+content="[^"]{50,}"/i, why: 'Search/social summary — needs to be a real sentence, not a stub.' },
    { what: '<meta property="og:title">', re: /<meta[^>]+property="og:title"/i, why: 'Link previews fall back to the raw URL without it.' },
    { what: '<meta property="og:description">', re: /<meta[^>]+property="og:description"/i, why: 'Link previews show no summary without it.' },
    { what: '<meta property="og:image">', re: /<meta[^>]+property="og:image"[^>]+content="https?:\/\//i, why: 'Link previews need an absolute image URL — a relative path is not resolved by most crawlers.' },
    { what: '<link rel="canonical">', re: /<link[^>]+rel="canonical"[^>]+href="https?:\/\//i, why: 'Absolute canonical URL — stops query-string and trailing-slash variants indexing as separate pages.' },
    { what: '<meta name="twitter:card">', re: /<meta[^>]+name="twitter:card"/i, why: 'Controls the preview shape on X/Twitter. The card tags are `name=`, not `property=` — Open Graph is the vocabulary that uses `property`, and a `property="twitter:card"` is silently ignored by validators that follow the spec.' },
    { what: '<meta name="theme-color">', re: /<meta[^>]+name="theme-color"/i, why: 'Mobile browser chrome flashes a light bar above a dark app without it.' },
    { what: '<link rel="icon">', re: /<link[^>]+rel="icon"/i, why: 'Browsers request /favicon.ico and 404 without it.' },
];

for (const { what, re, why } of REQUIRED_HEAD) {
    if (!re.test(html)) fail(INDEX_HTML, `missing ${what}`, why);
}

const PLACEHOLDER_ORIGIN = 'example.com';
const usesPlaceholder = html.includes(PLACEHOLDER_ORIGIN);

// Zoom is an accessibility feature — blocking it fails WCAG 1.4.4.
if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html)) {
    fail(INDEX_HTML, 'viewport blocks zoom', 'Never `user-scalable=no` / `maximum-scale=1` — pinch-zoom is an accessibility feature (WCAG 1.4.4).');
}

// ── 2. The entry module resolves ────────────────────────────────────────────
{
    const src = /<script[^>]+type="module"[^>]+src="([^"]+)"/.exec(html)?.[1];
    if (src === undefined) {
        fail(INDEX_HTML, 'no `<script type="module" src="…">`', 'It is the single entry Vite builds the graph from. Without it the built page loads nothing.');
    } else {
        const rel = `frontend${src}`;
        // Vite resolves the specifier, not the file name, so a `.js` src for a
        // `.ts` module happens to work in dev and is still a lie about the tree.
        const candidates = [rel, rel.replace(/\.js$/, '.ts')];
        const found = candidates.find((c) => fs.existsSync(path.join(ROOT, c)));
        if (found === undefined) {
            fail(INDEX_HTML, `entry \`${src}\` does not exist`, 'Nothing typechecks this path. Point it at the real entry module.');
        } else if (found !== rel) {
            fail(
                INDEX_HTML,
                `entry is \`${src}\` but the file is \`${found.replace(/^frontend/, '')}\``,
                'Vite resolves the specifier rather than the filename, so this works — right up until something else reads the tag literally. Name the file that exists.',
            );
        }
    }
}

// ── 3. Reduced-motion override ──────────────────────────────────────────────
const scss = fs.readFileSync(path.join(ROOT, BASE_SCSS), 'utf8');

if (!/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(scss)) {
    fail(
        BASE_SCSS,
        'missing `@media (prefers-reduced-motion: reduce)` block',
        'The global motion override is what honours the OS setting for every animated component at once (WCAG 2.3.3). ' +
            'Without it each of the ~220 transition/animation declarations would have to opt out individually.',
    );
} else {
    const block = /@media\s*\(\s*prefers-reduced-motion[\s\S]*$/.exec(scss)?.[0] ?? '';
    for (const prop of ['animation-duration', 'transition-duration']) {
        if (!new RegExp(`${prop}:[^;]*!important`).test(block)) {
            fail(BASE_SCSS, `reduced-motion block does not force ${prop}`, 'It must carry `!important` to beat component-scoped rules, or it silently loses the cascade.');
        }
    }
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
    console.error(`\n✖ ${failures.length} HTML standard violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See html.instructions.md, then re-run.');
    process.exit(1);
}

console.log('HTML standards OK (document shell metadata, zoom not blocked, reduced-motion override intact).');

if (usesPlaceholder) {
    console.warn(
        `\n⚠ ${INDEX_HTML} still uses the placeholder origin "${PLACEHOLDER_ORIGIN}".` +
            '\n  Before launch:' +
            '\n    • point canonical / og:url / og:image at the real domain' +
            '\n    • add the og-image.png asset (1200×630) — the URL 404s until it exists' +
            '\n    • move canonical to per-route generation (unhead/vue-meta): one static' +
            '\n      canonical tells crawlers every route is the homepage.',
    );
}

console.log('\nNot machine-checked: semantic element choice, ARIA appropriateness, alt-text quality.');

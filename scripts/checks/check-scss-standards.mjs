#!/usr/bin/env node
/**
 * SCSS architecture gate (scss.instructions.md).
 *   1. THE BARREL. `index.scss` @forwards the token layer and @uses the rest,
 *      and `main.ts` imports it once. Import it twice and every global rule is
 *      emitted twice; drop the @forward and `@use '@/styles'` stops resolving.
 *   2. THE VITE INJECTION. `css.preprocessorOptions.scss.additionalData` is what
 *      puts `$color-*` in scope inside every SFC without an import. Lose it and
 *      every component that names a token fails to compile at once — but nothing
 *      in the style files themselves records that they depend on it.
 *   3. THEME PARITY. All 52 palettes are maps of the same token keys. A key
 *      missing from one map is a `var(--color-x)` with no value in that theme —
 *      an invisible element, only in that theme, only for whoever picked it.
 *      This is the CSS analogue of the locale parity in check-i18n.mjs and it
 *      fails the same silent way. A map defined but never registered in
 *      `$themes` is the mirror case: a theme nobody can select.
 *   4. NO SCSS COLOUR FUNCTIONS ON A `$color-*` TOKEN. The tokens resolve to
 *      CSS custom properties at runtime — that is what makes 52 themes one
 *      stylesheet — and Sass cannot compute on a value it will not see until
 *      the browser does. `darken($color-accent-1, 10%)` either throws at build
 *      time or silently computes against the wrong palette. `color-mix()` is
 *      the runtime equivalent and is the only correct answer.
 *   5. NO `@extend` INSIDE AN SFC. `@extend` cannot cross the SFC boundary: a
 *      `%placeholder` is compiled per-file, so extending one from a component
 *      either fails to resolve or silently duplicates the rule into every
 *      component that does it. Anything shared is a real global class in
 *      `styles/components/`.
 *   6. SELF-HOSTED FONTS. The standard bans CDN fonts outright — zero
 *      third-party requests, deterministic builds, offline-safe. That is a claim
 *      about what is ABSENT from the repo, which only a sweep can check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const STYLES = 'frontend/src/styles';
const VARIABLES = `${STYLES}/_variables.scss`;
const THEMES = `${STYLES}/_themes.scss`;
const INDEX = `${STYLES}/index.scss`;
const MAIN_TS = 'frontend/src/main.ts';
const VITE_CONFIG = 'frontend/vite.config.ts';
const VENDORED = 'frontend/src/lib/lightweight-charts/';

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. The barrel ───────────────────────────────────────────────────────────
const index = read(INDEX);
const main = read(MAIN_TS);

if (!/@forward\s+['"][^'"]*variables['"]/.test(index)) {
    fail(INDEX, 'does not `@forward` variables', "SFCs reach the tokens through `@use '@/styles'`, which only resolves what the barrel forwards.");
}

const barrelImports = [...main.matchAll(/import\s+['"]([^'"]*styles[^'"]*)['"]/g)];
if (barrelImports.length !== 1) {
    fail(
        MAIN_TS,
        `imports the style barrel ${barrelImports.length} time(s), expected exactly 1`,
        'The barrel emits every global rule. Importing it twice duplicates all of them in the bundle; importing it zero times ships an unstyled app.',
    );
}

const strayBarrelUse = walk('frontend/src', '.vue').filter((rel) => /@use\s+['"]@\/styles['"]/.test(read(rel)));
if (strayBarrelUse.length > 0) {
    fail(
        strayBarrelUse.join(', '),
        'manually @use-s the style barrel',
        'The token layer is auto-injected into every SFC by Vite (see below). A manual @use is redundant and re-emits the partials into that component.',
    );
}

// ── 2. The Vite injection ───────────────────────────────────────────────────
const vite = read(VITE_CONFIG);
if (!/additionalData/.test(vite) || !/@use\s+'@\/styles\/variables'\s+as\s+\*/.test(vite)) {
    fail(
        VITE_CONFIG,
        'no longer injects the token layer via `css.preprocessorOptions.scss.additionalData`',
        'This is what puts $color-*/$space-* in scope inside every SFC without an import. Without it every component that references a token fails to compile.',
    );
}

// ── 3. Theme parity ─────────────────────────────────────────────────────────
const themesSrc = read(THEMES);

/** Every top-level `$name: ( 'key': value, … );` map, with its token keys. */
const maps = [...themesSrc.matchAll(/^\$([a-z0-9-]+):\s*\(\n([\s\S]*?)^\);/gm)]
    .map(([, name, body]) => ({ name, keys: new Set([...body.matchAll(/'([a-z0-9-]+)'\s*:/g)].map((m) => m[1])) }))
    .filter((m) => m.name !== 'themes');

/** The registry: `$themes: ( 'name': ($map, dark), … );` — a theme exists only if it is in here. */
const registered = new Set([...(/^\$themes:\s*\(([\s\S]*?)^\);/m.exec(themesSrc)?.[1] ?? '').matchAll(/\$([a-z0-9-]+)\s*,/g)].map((m) => m[1]));

const reference = maps.find((m) => m.name === 'default');
if (reference === undefined) {
    fail(THEMES, 'no `$default` theme map found', 'It is the reference shape every other palette is checked against, and the one emitted on `:root`. If it moved, this gate is blind and must be repointed.');
} else {
    for (const map of maps) {
        if (map === reference) continue;
        const missing = [...reference.keys].filter((k) => !map.keys.has(k));
        const extra = [...map.keys].filter((k) => !reference.keys.has(k));
        if (missing.length > 0 || extra.length > 0) {
            fail(
                THEMES,
                `$${map.name} keys differ from $default` +
                    (missing.length > 0 ? ` — missing: ${missing.join(', ')}` : '') +
                    (extra.length > 0 ? ` — extra: ${extra.join(', ')}` : ''),
                'A token missing from one map renders as an empty `var(--color-x)` in that theme only — an invisible element for whoever selected it. Every map defines every key.',
            );
        }
    }
    const orphans = maps.filter((m) => m.name !== 'default' && !registered.has(m.name));
    if (orphans.length > 0) {
        fail(
            THEMES,
            `theme map(s) defined but not registered in \`$themes\`: ${orphans.map((m) => `$${m.name}`).join(', ')}`,
            'The `@each` over `$themes` is what emits the `[data-theme]` blocks. A map outside it produces no CSS — it is either dead weight or a theme users cannot select.',
        );
    }
}

const variables = read(VARIABLES);
if (!/@mixin\s+emit-theme/.test(variables)) {
    fail(VARIABLES, 'missing the `emit-theme` mixin', 'It is the single place that turns a theme map into custom properties and sets `color-scheme` — without it the maps are inert.');
}
if (!/color-scheme:/.test(variables)) {
    fail(VARIABLES, 'no `color-scheme` declaration', 'Native controls, scrollbars and form widgets keep the UA default and clash with a dark theme.');
}

// ── 4. No SCSS colour functions on a token ──────────────────────────────────
const COLOUR_FN = /\b(?:lighten|darken|saturate|desaturate|transparentize|opacify|fade-in|fade-out|rgba|color\.(?:adjust|scale|change|mix|invert|complement))\(\s*\$color-[a-z0-9-]+/g;

for (const rel of styleBearingFiles()) {
    for (const [hit] of read(rel).matchAll(COLOUR_FN)) {
        fail(
            rel,
            `\`${hit}…\` computes on a token`,
            'A `$color-*` token is a `var(--color-…)` at runtime — 52 themes are one stylesheet precisely because Sass never sees the value. Use `color-mix(in srgb, …)`, which the browser evaluates against whichever palette is live.',
        );
    }
}

// ── 5. No @extend inside an SFC ─────────────────────────────────────────────
for (const rel of walk('frontend/src', '.vue')) {
    for (const [, target] of read(rel).matchAll(/@extend\s+([^;]+);/g)) {
        fail(
            rel,
            `\`@extend ${target.trim()}\` inside a component`,
            '@extend cannot cross the SFC boundary — each component compiles alone, so a %placeholder either fails to resolve or is duplicated into every component that extends it. Promote it to a real global class in styles/components/ and put the class in the markup.',
        );
    }
}

// ── 6. Self-hosted fonts ────────────────────────────────────────────────────
const REMOTE_FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.bunny\.net|cdn\.jsdelivr|unpkg\.com/;

for (const rel of [...styleBearingFiles(), 'frontend/index.html']) {
    if (REMOTE_FONT_HOSTS.test(read(rel))) {
        fail(rel, 'references a font CDN', 'Fonts are self-hosted or a system stack: zero third-party requests, deterministic builds, offline-safe.');
    }
}

const frontendPkg = JSON.parse(read('frontend/package.json'));
const fontPkgs = Object.keys({ ...frontendPkg.dependencies, ...frontendPkg.devDependencies }).filter((d) => d.startsWith('@fontsource'));
if (fontPkgs.length > 0) {
    fail('frontend/package.json', `depends on ${fontPkgs.join(', ')}`, 'The standard is explicit: do not depend on font packages to ship glyphs. Vendor the woff2 files instead.');
}

/** Everything that can carry a style rule, minus the vendored fork. */
function styleBearingFiles() {
    return [...walk('frontend/src', '.scss'), ...walk('frontend/src', '.vue')];
}

function walk(rel, ext, out = []) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (child.startsWith(VENDORED)) continue;
        if (entry.isDirectory()) walk(child, ext, out);
        else if (entry.name.endsWith(ext)) out.push(child);
    }
    return out;
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} SCSS architecture violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See scss.instructions.md, then re-run.');
    process.exit(1);
}

console.log(
    `✓ SCSS architecture OK — barrel forwarded and imported once, tokens injected by Vite, ${maps.length} theme maps all matching $default's ${reference?.keys.size ?? 0} keys and all registered, no Sass colour maths on a token, no @extend in an SFC, no font CDN.`,
);
console.log(
    '\nNot machine-checked: whether a token is the RIGHT token, whether a palette is legible, whether a component should have needed a new class at all. stylelint owns BEM, unit allow-lists and declaration-strict-value.',
);

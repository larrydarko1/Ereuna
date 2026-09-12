#!/usr/bin/env node
/**
 * tsconfig drift gate.
 * The compiler settles what is checked, and every rule here exists because a
 * config can be wrong in a way that makes MORE code compile, not less — so the
 * build stays green and the mistake is invisible until something ships:
 *   • a project that does not extend the base, or extends it FIRST in an
 *     `extends` array. Later entries win, so a base listed ahead of a preset is
 *     silently overridden — the file names the strict config and gets the
 *     lax one;
 *   • a base flag re-declared weaker in one workspace with no reason written
 *     down. That is how `verbatimModuleSyntax: false` — a workaround for the
 *     vendored charting fork — ended up in the base, turning it off for four
 *     backends that were already clean under it;
 *   • the base growing a `target`, a `lib` or an `outDir`. Those differ per
 *     workspace and each one records its own reason; a value in the base is one
 *     nobody chose;
 *   • `types` dropped from a project. The default is not "no globals", it is
 *     EVERY hoisted `@types/*` package — so the config still compiles and the
 *     program silently widens to whatever a transitive dependency installed;
 *   • `outDir`/`declaration` on packages/shared, which nothing compiles. Its
 *     `exports` point at `./src/*.ts` on purpose; an emit there creates a
 *     `dist/` that is stale from the moment it is written;
 *   • a `target` and a `lib` naming different ES years, which types the old
 *     library surface while emitting the new syntax;
 *   • a project config no script ever runs. That is how `e2e/tsconfig.json`
 *     was hardened and stayed broken — nothing pointed a compiler at it.
 * Rules from the imported gate that are DELIBERATELY NOT HERE, so their absence
 * is a decision and not an oversight:
 *   - JSON Schema validation via ajv. Fifteen of the seventeen gates take no
 *     dependencies, and the schema it validated against declared
 *     `additionalProperties: true` at both levels with every property typed
 *     `boolean` — it could not reject a single real drift. Rules 2 to 6 below
 *     are that schema, written as the assertions it was trying to express.
 *   - Walking the vendored fork. `frontend/src/lib/lightweight-charts/` ships
 *     six upstream `tsconfig.composite.*.json` files that extend a
 *     `tsconfig.composite.base.json` which was never vendored. They are frozen,
 *     they resolve to nothing, and no script reads them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';
import { stripComments } from '../lib/strip-comments.mjs';

const BASE = 'tsconfig.base.json';
const FORK = 'frontend/src/lib/lightweight-charts';
const SHARED = 'packages/shared/tsconfig.json';
const NODE_TYPED = ['api/tsconfig.json', 'worker/tsconfig.json', 'ingestor/tsconfig.json'];

/**
 * The checking rules the base owns, at the value that is the strict one. A
 * project may differ — with a reason — but the base may not be missing any of
 * them, or strictness becomes something each workspace decides for itself.
 */
const BASE_FLAGS = {
    strict: true,
    exactOptionalPropertyTypes: true,
    noImplicitOverride: true,
    noImplicitReturns: true,
    noPropertyAccessFromIndexSignature: true,
    noUncheckedIndexedAccess: true,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    noFallthroughCasesInSwitch: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    esModuleInterop: true,
    isolatedModules: true,
    noUncheckedSideEffectImports: true,
    resolveJsonModule: true,
    verbatimModuleSyntax: true,
    erasableSyntaxOnly: true,
    forceConsistentCasingInFileNames: true,
    skipLibCheck: true,
};

/** Settings that describe an environment, not a checking rule. The base states it holds none. */
const ENVIRONMENTAL = ['target', 'lib', 'module', 'moduleResolution', 'outDir', 'rootDir', 'noEmit', 'paths', 'types'];

/** Section dividers, in the order they must appear. Mirrors the reference implementation. */
const SECTIONS = [
    'Output & Build',
    'Target & Environment',
    'Paths & Types',
    'Type Checking - Base',
    'Type Checking - Additional Strictness',
    'Specific Behaviors',
    'Module System',
    'Library & Syntax',
];

const errors = [];
const fail = (rel, problem, why) => errors.push({ rel, problem, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const configs = new Map(findConfigs('.').map((rel) => [rel, parse(rel)]));
const base = configs.get(BASE);

if (base === undefined) {
    console.error(`✖ ${BASE} is missing. It is the one file that decides what is checked.`);
    process.exit(1);
}

/** Configs that actually check code: not the base, not a `files: []` solution file. */
const projects = [...configs].filter(([rel, cfg]) => rel !== BASE && cfg.options !== undefined);

// ── 1. Every project extends the base, and the base wins ────────────────────
// Resolved, not spelled: `../../tsconfig.base.json` from a workspace one level
// down points outside the repo, and tsc treats a missing `extends` target as a
// warning it carries on past. The file reads as strict and is not.
for (const [rel, cfg] of projects) {
    const parents = cfg.data.extends === undefined ? [] : [cfg.data.extends].flat();
    const at = parents.findIndex((p) => resolveExtends(p, rel) === BASE);

    if (at === -1) {
        const spelled = parents.find((p) => p.endsWith(BASE));
        if (spelled !== undefined) {
            fail(rel, `extends "${spelled}", which does not resolve to ${BASE}`, `From this file that path is ${path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, rel)), spelled))}, which is not a file. tsc warns and carries on, so the project silently checks nothing it names.`);
        } else {
            fail(rel, `does not extend ${BASE}`, 'A project outside the base decides its own strictness, and the default is lax. Extend it, even to override one flag afterwards.');
        }
    } else if (at !== parents.length - 1) {
        fail(
            rel,
            `extends ${BASE} at position ${at + 1} of ${parents.length}`,
            'Later entries win. A base ahead of a preset is overridden by it: the file names the strict config and compiles under the lax one, with nothing to show for it. Put the base last.',
        );
    }
}

// ── 2. The base holds every checking flag and no environment ────────────────
for (const [flag, strictValue] of Object.entries(BASE_FLAGS)) {
    const actual = base.options[flag];
    if (actual === undefined) {
        fail(BASE, `does not set \`${flag}\``, 'Every checking rule lives here, so that turning one off is one visible edit rather than a value a workspace quietly never set.');
    } else if (actual !== strictValue) {
        fail(BASE, `sets \`${flag}: ${actual}\``, `The base carries the strict value (${strictValue}). A workspace that genuinely cannot hold this overrides it locally, with the reason next to it — rule 3.`);
    }
}
for (const setting of ENVIRONMENTAL) {
    if (base.options[setting] !== undefined) {
        fail(
            BASE,
            `sets \`${setting}\``,
            'The base is checking rules only — its own header says so. A target, a lib or an emit path differs per workspace and each one records why it is what it is; a value here is one nobody chose and every workspace silently inherits.',
        );
    }
}

// ── 3. Weakening a base flag needs the reason written next to it ────────────
// Not a comment somewhere in the file: next to the line. The one override in
// this repo (the fork's verbatimModuleSyntax) is five lines long and says what
// would have to change for it to go away — that is the bar.
for (const [rel, cfg] of projects) {
    for (const flag of Object.keys(BASE_FLAGS)) {
        if (cfg.own[flag] === undefined || cfg.own[flag] === BASE_FLAGS[flag]) continue;
        if (!hasReason(cfg.raw, flag)) {
            fail(
                rel,
                `overrides \`${flag}: ${cfg.own[flag]}\` with no reason`,
                'Relaxing an inherited check is a decision, and the next person reads the file, not the commit. Write what forces it and what would let it be removed.',
            );
        }
    }
}

// ── 4. A declared target names the same ES year as its lib ──────────────────
for (const [rel, cfg] of projects) {
    const { target, lib } = cfg.own;
    if (target === undefined) continue;
    if (lib === undefined) {
        fail(rel, `sets \`target: "${target}"\` with no \`lib\``, 'Without one the library surface is inferred from the target, which is fine until the target moves and nothing says the two are meant to agree. State it.');
    } else if (String(lib[0]).toLowerCase() !== String(target).toLowerCase()) {
        fail(
            rel,
            `targets ${target} but its lib starts at ${lib[0]}`,
            'A lib behind the target types the old standard library while the emit uses the new syntax; a lib ahead of it types methods the runtime floor does not have. The first lib entry is the ES year and must match.',
        );
    }
}

// ── 5. Every project declares `types` ───────────────────────────────────────
// The default is not "none". It is every `@types/*` package hoisted into scope,
// so the program widens whenever a transitive dependency adds one and nothing
// in the diff shows it.
for (const [rel, cfg] of projects) {
    if (cfg.own.types === undefined) {
        fail(rel, 'does not declare `types`', 'Omitting it pulls in every hoisted `@types/*` package, so what is in scope is decided by the dependency tree. List what this project actually needs.');
    }
}
for (const rel of NODE_TYPED) {
    const own = configs.get(rel)?.own;
    if (own !== undefined && JSON.stringify(own.types) !== JSON.stringify(['node'])) {
        fail(rel, `declares types ${JSON.stringify(own.types)}`, 'A Node service takes `["node"]` and nothing else — no DOM lib, no test globals in the shipped program.');
    }
}

// ── 6. packages/shared never emits ──────────────────────────────────────────
// Every consumer reads it as TypeScript source: the frontend transpiles it, the
// backends run it through tsx. That is why `exports` points at `./src/*.ts`.
{
    const shared = configs.get(SHARED);
    for (const setting of ['outDir', 'declaration', 'composite', 'declarationDir', 'emitDeclarationOnly']) {
        if (shared?.own[setting] !== undefined) {
            fail(
                SHARED,
                `sets \`${setting}\``,
                'Nothing compiles this package and it has no build script, so an emit here produces a dist/ that is stale the moment it is written — and the first `exports` edit that points at it ships the stale copy.',
            );
        }
    }
}

// ── 7. Every project config is reached by a typecheck script ────────────────
// A config nothing runs is a config that drifts for free, which is exactly what
// e2e/tsconfig.json did: hardened in place, never compiled.
{
    const reached = reachableConfigs();
    for (const [rel] of projects) {
        if (!reached.has(rel)) {
            fail(
                rel,
                'is not reached by any typecheck script',
                'Add it to the workspace `typecheck` script (`-p <file>`) or to the root one. Rules 1 to 6 only constrain what a config says; nothing but a compiler run constrains whether it is true.',
            );
        }
    }
}

// ── 8. Section dividers come from the known set, in order ───────────────────
for (const [rel, cfg] of configs) {
    const found = sectionsOf(cfg.raw);
    let highest = -1;
    for (const { name, line } of found) {
        const at = SECTIONS.indexOf(name);
        if (at === -1) {
            fail(rel, `unknown section divider "${name}" (line ${line})`, `One of: ${SECTIONS.join(', ')}. A divider nobody else uses sorts nowhere and stops grouping anything.`);
        } else if (at < highest) {
            fail(rel, `section "${name}" is out of order (line ${line})`, `Dividers run in a fixed order so the same setting sits in the same place in every file: ${SECTIONS.join(' → ')}.`);
        } else {
            highest = at;
        }
    }
}

/** Every tsconfig in the repo, minus node_modules, dotted directories and the frozen fork. */
function findConfigs(rel, out = []) {
    for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const child = rel === '.' ? entry.name : `${rel}/${entry.name}`;
        if (child === FORK) continue;
        if (entry.isDirectory()) findConfigs(child, out);
        else if (/^tsconfig(\..+)?\.json$/.test(entry.name)) out.push(child);
    }
    return out;
}

/**
 * A config as both text and data. `options` is what the file plus its ancestors
 * decide; `own` is only what this file states, which is what rules 3 to 6 are
 * about — inheriting a setting is not the same as choosing it.
 */
function parse(rel) {
    const raw = read(rel);
    let data;
    try {
        data = JSON.parse(stripComments(raw));
    } catch (e) {
        fail(rel, `is not parseable JSON (${e.message})`, 'tsc reads JSONC — comments are fine, a trailing comma is not.');
        data = {};
    }
    return { raw, data, own: data.compilerOptions ?? {}, options: effective(rel, data) };
}

/** compilerOptions merged down the `extends` chain, nearest file winning. */
function effective(rel, data, seen = new Set()) {
    if (seen.has(rel)) return {}; // cyclic extends: tsc's error to report, not ours
    seen.add(rel);

    let inherited = {};
    for (const specifier of data.extends === undefined ? [] : [data.extends].flat()) {
        const parent = resolveExtends(specifier, rel);
        if (parent === null) continue; // an unresolvable parent is tsc's complaint
        try {
            inherited = { ...inherited, ...effective(parent, JSON.parse(stripComments(read(parent))), seen) };
        } catch {
            continue;
        }
    }
    return data.compilerOptions === undefined && Object.keys(inherited).length === 0
        ? undefined
        : { ...inherited, ...(data.compilerOptions ?? {}) };
}

/** Resolve one `extends` entry to a repo-relative path, or null for a package outside the tree. */
function resolveExtends(specifier, fromRel) {
    if (!specifier.startsWith('.')) return null; // a published preset — not ours to check
    const base = path.resolve(path.dirname(path.join(ROOT, fromRel)), specifier);
    const hit = [base, `${base}.json`, path.join(base, 'tsconfig.json')].find(
        (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
    );
    return hit === undefined ? null : path.relative(ROOT, hit);
}

/** Is there a comment on this setting's line, or on the lines immediately above it? */
function hasReason(raw, flag) {
    const lines = raw.split('\n');
    const at = lines.findIndex((line) => new RegExp(`^\\s*"${flag}"\\s*:`).test(line));
    if (at === -1) return false;
    if (/\/\/|\/\*/.test(lines[at].replace(new RegExp(`^\\s*"${flag}"\\s*:.*?(?=//|/\\*|$)`), ''))) return true;

    for (let i = at - 1; i >= 0; i--) {
        const above = lines[i].trim();
        if (above === '') continue;
        // A section divider is a label, not a reason — keep walking past it.
        if (/^\/\*.*\*\/$/.test(above) && SECTIONS.includes(above.replace(/^\/\*\s*|\s*\*\/$/g, '').split(' — ')[0])) continue;
        return above.startsWith('//') || above.startsWith('*') || above.endsWith('*/');
    }
    return false;
}

/**
 * Single-line `/* … *\/` comments, which is what a section divider is. A
 * multi-line block is prose about the setting under it and is left alone; a
 * divider may carry a trailing ` — reason`, and sorts on the label before it.
 */
function sectionsOf(raw) {
    return raw
        .split('\n')
        .map((line, i) => ({ line: i + 1, text: line.trim() }))
        .filter(({ text }) => /^\/\*[^*].*\*\/$/.test(text))
        .map(({ line, text }) => ({ line, name: text.replace(/^\/\*\s*|\s*\*\/$/g, '').split(' — ')[0].trim() }));
}

/**
 * Configs a compiler is actually pointed at. Every `npm run` script in the repo
 * is read, not just `typecheck`, and each `&&` segment is judged on its own: a
 * `-p` names its project outright, and a bare `tsc` falls back to the
 * `tsconfig.json` beside the manifest that runs it. `npm -w x run y` needs no
 * handling — workspace x's own scripts are scanned in their own right.
 */
function reachableConfigs() {
    const hit = new Set();

    for (const dir of ['.', ...workspaceDirs()]) {
        const scripts = JSON.parse(read(path.join(dir, 'package.json'))).scripts ?? {};
        for (const segment of Object.values(scripts).flatMap((command) => command.split('&&'))) {
            if (!/\b(?:vue-)?tsc\b/.test(segment)) continue;
            const named = /(?:-p|--project)\s+(\S+)/.exec(segment);
            hit.add(path.normalize(path.join(dir, named === null ? 'tsconfig.json' : named[1])));
        }
    }
    return hit;
}

function workspaceDirs() {
    return JSON.parse(read('package.json')).workspaces.filter((dir) => fs.existsSync(path.join(ROOT, dir, 'package.json')));
}

// ── Report ──────────────────────────────────────────────────────────────────
if (errors.length > 0) {
    console.error(`\n✖ ${errors.length} tsconfig problem(s):\n`);
    for (const { rel, problem, why } of errors) {
        console.error(`  ${rel}: ${problem}`);
        console.error(`    → ${why}\n`);
    }
    process.exit(1);
}

console.log(
    `✔ tsconfigs consistent: ${projects.length} projects, each extending ${BASE} last, ` +
        `${Object.keys(BASE_FLAGS).length} checking flags owned by the base and nothing environmental, ` +
        'every override explained, every target matched to its lib, every project scoping its own `types` and reached by a compiler.',
);
console.log(
    '\nNot machine-checked: whether a target is the right one for its runtime, whether an override is still needed, ' +
        'or whether the browser floor the bundler enforces matches what the frontend typechecks against.',
);

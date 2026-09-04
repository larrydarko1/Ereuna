#!/usr/bin/env node
/**
 * .env.example ↔ config.ts drift gate (+ local .env advisory).
 * For each service it:
 *   1. Extracts every env key the Zod schema in src/lib/config.ts declares.
 *   2. Reads the keys declared in .env.example (including commented `# KEY=`
 *      lines, which document optional/feature-gated vars).
 *   3. Fails if either side has a key the other doesn't:
 *        • in config, missing from .env.example  → undocumented env var
 *        • in .env.example, not read by config    → stale/dead example key
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';


/**
 * Each service: its config module, the .env.example that documents it, and the
 * local .env it actually boots with (advisory only — gitignored, absent in CI).
 */
const SERVICES = [
    { name: 'api', config: 'api/src/lib/config.ts', example: 'api/.env.example', local: 'api/.env' },
    { name: 'worker', config: 'worker/src/lib/config.ts', example: 'worker/.env.example', local: 'worker/.env' },
    { name: 'ingestor', config: 'ingestor/src/lib/config.ts', example: 'ingestor/.env.example', local: 'ingestor/.env' },
];

/** Shared Zod fragments the config modules spread in (`...mongoEnv` etc.). */
const SHARED_ENV = 'packages/shared/src/config/env.ts';

/** Keys the runtime injects or that are conventionally undocumented. */
const IGNORED = new Set(['NODE_ENV']);

/** UPPER_SNAKE object keys (env-var fields) declared as `KEY:` at line start. */
function schemaFieldKeys(src) {
    const keys = new Set();
    for (const m of src.matchAll(/^\s*([A-Z][A-Z0-9_]*):/gm)) keys.add(m[1]);
    return keys;
}

/** Map each `export const NAME = { ... }` fragment in shared env.ts to its keys. */
function sharedFragments() {
    const src = fs.readFileSync(path.join(ROOT, SHARED_ENV), 'utf8');
    const frags = {};
    for (const m of src.matchAll(/export const (\w+) = \{([\s\S]*?)\n\};/g)) {
        frags[m[1]] = schemaFieldKeys(m[2]);
    }
    return frags;
}

/**
 * Env keys a config module reads: its inline Zod schema fields plus the keys of
 * every shared fragment it spreads (`...s3Env`). Env is validated by Zod now,
 * so the schema — not `process.env.X` — is the source of truth.
 */
function configKeys(file, frags) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const keys = schemaFieldKeys(src);
    for (const m of src.matchAll(/\.\.\.(\w+)/g)) {
        for (const k of frags[m[1]] ?? []) keys.add(k);
    }
    for (const k of IGNORED) keys.delete(k);
    return keys;
}

/**
 * Extract the env keys declared in a dotenv-style file.
 * `commentedCounts` is the whole difference between the two files we parse:
 *   .env.example — a commented `# KEY=` DOCUMENTS an optional var → counts.
 *   .env         — a commented `# KEY=` is a var that is NOT SET → does not count.
 * Conflating the two would report a commented-out key in a real .env as present.
 */
function dotenvKeys(file, { commentedCounts }) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const keys = new Set();
    for (const raw of src.split('\n')) {
        const isComment = /^\s*#/.test(raw);
        if (isComment && !commentedCounts) continue;
        const line = commentedCounts ? raw.replace(/^\s*#\s?/, '').trim() : raw.trim();
        const m = line.match(/^([A-Z0-9_]+)=/);
        if (m && !IGNORED.has(m[1])) keys.add(m[1]);
    }
    return keys;
}

const frags = sharedFragments();
let failed = false;
let warned = false;

for (const svc of SERVICES) {
    const inConfig = configKeys(svc.config, frags);
    const inExample = dotenvKeys(svc.example, { commentedCounts: true });

    const undocumented = [...inConfig].filter((k) => !inExample.has(k)).sort();
    const stale = [...inExample].filter((k) => !inConfig.has(k)).sort();

    if (undocumented.length === 0 && stale.length === 0) {
        console.log(`✔ ${svc.name}: config.ts and .env.example in sync (${inConfig.size} keys)`);
    } else {
        failed = true;
        console.error(`\n✘ ${svc.name}: env drift between ${svc.config} and ${svc.example}`);
        if (undocumented.length) {
            console.error(`  Read in config.ts but missing from .env.example:`);
            for (const k of undocumented) console.error(`    - ${k}`);
        }
        if (stale.length) {
            console.error(`  In .env.example but not read by config.ts:`);
            for (const k of stale) console.error(`    - ${k}`);
        }
    }

    // ── Advisory: the local .env you actually boot with ──────────────────
    const localPath = path.join(ROOT, svc.local);
    if (!fs.existsSync(localPath)) continue;

    const inLocal = dotenvKeys(svc.local, { commentedCounts: false });
    const expected = dotenvKeys(svc.example, { commentedCounts: false });
    const missing = [...expected].filter((k) => !inLocal.has(k)).sort();
    const unknown = [...inLocal].filter((k) => !inConfig.has(k)).sort();

    if (missing.length) {
        warned = true;
        console.warn(
            `\n⚠ ${svc.name}: ${svc.local} is missing ${missing.length} key(s) that ${svc.example} sets.` +
                `\n  Each falls back to its Zod default, so the service still starts — which is exactly` +
                `\n  why this drifts unnoticed. Prod-only required keys will fail at deploy, not here.`,
        );
        for (const k of missing) console.warn(`    - ${k}`);
    }

    if (unknown.length) {
        warned = true;
        console.warn(`\n⚠ ${svc.name}: ${svc.local} sets key(s) no config.ts reads (dead — likely renamed):`);
        for (const k of unknown) console.warn(`    - ${k}`);
    }
}

const structural = [];
const structuralFail = (file, what, why) => structural.push({ file, what, why });

// ── A. dotenv is the first import ────────────────────────────────────────────
for (const rel of SERVICES.map((svc) => `${svc.name}/src/index.ts`)) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const imports = [...src.matchAll(/^import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);

    if (imports.length === 0) {
        structuralFail(rel, 'no import statements found — this check needs re-pointing', 'It exists to prove dotenv is first; a version that finds nothing proves nothing.');
    } else if (imports[0] !== 'dotenv/config') {
        structuralFail(
            rel,
            `the first import is '${imports[0]}', not 'dotenv/config'`,
            'Imports are hoisted and run in order. Anything above dotenv that reads process.env at module load — a config singleton especially — sees an unpopulated env and silently takes every Zod default. Nothing fails; the service just runs on the wrong values.',
        );
    }
}

// ── B. Secrets never carry a bare `.default()` ───────────────────────────────
const SECRET_KEY_RE = /_(SECRET|KEY|PASS|PASSWORD|TOKEN)$/;
const SAFE_SECRET_FORMS = /requiredSecret\(|hexSecret\(|infraDefault\(|\.optional\(\)/;

for (const rel of [...SERVICES.map((svc) => svc.config), SHARED_ENV]) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const guard = /\.superRefine\(([\s\S]*?)\n {4}\}\);/.exec(src)?.[1] ?? '';

    for (const [, key, decl] of src.matchAll(/^\s+([A-Z][A-Z0-9_]*):\s*(.+?),?\s*$/gm)) {
        if (!SECRET_KEY_RE.test(key)) continue;
        if (SAFE_SECRET_FORMS.test(decl)) continue;
        if (!/\.default\(/.test(decl)) continue;
        if (guard.includes(key)) continue;

        structuralFail(
            rel,
            `${key} is a secret with a bare .default() and no superRefine guard`,
            'A defaulted key is exempt from fail-fast forever: a deploy that forgets it boots on the placeholder instead of crashing. Use requiredSecret()/hexSecret() (no default), infraDefault() (re-arms in prod), .optional() (typed as absent), or name it in the superRefine so it becomes required once its feature is on.',
        );
    }
}

// ── C. Shared keys are declared once ─────────────────────────────────────────
for (const svc of SERVICES) {
    const src = fs.readFileSync(path.join(ROOT, svc.config), 'utf8');
    const own = schemaFieldKeys(src);
    const spread = [...src.matchAll(/\.\.\.(\w+)/g)].map((m) => m[1]);

    for (const name of spread) {
        for (const key of frags[name] ?? []) {
            if (own.has(key)) {
                structuralFail(
                    svc.config,
                    `redeclares ${key}, which it already gets from \`...${name}\``,
                    `The local field silently wins and ${SHARED_ENV} stops being the source of truth for it. That is how two services end up validating the same variable differently.`,
                );
            }
        }
    }
}

// ── D. The canonical config tree ─────────────────────────────────────────────
const CANONICAL_GROUPS = {
    'api/src/lib/config.ts': ['jwt', 'mongo', 'redis', 'corsOrigin', 'logos'],
    'worker/src/lib/config.ts': ['mongo', 'redis', 'tiingo'],
    'ingestor/src/lib/config.ts': ['mongo', 'redis', 'tiingo'],
};

for (const [rel, groups] of Object.entries(CANONICAL_GROUPS)) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // `as const` is optional: the api and both services close the object with it.
    const body = /export const config = \{([\s\S]*)\n\}(?: as const)?;/.exec(src)?.[1];
    if (body === undefined) {
        structuralFail(rel, 'could not find `export const config = { … }`', 'The config module shape is what every other standard reads from; if it moved, this check must be re-pointed.');
        continue;
    }
    for (const group of groups) {
        if (!new RegExp(`^ {4}${group}\\b`, 'm').test(body)) {
            structuralFail(
                rel,
                `config.${group} is missing from the exported config`,
                'The canonical config tree is a cross-standard interface — db reads config.mongo, the api standard reads config.corsOrigin and config.jwt, observability reads config.redis. Renaming a group breaks every consumer at once.',
            );
        }
    }
}

// ── E. No real secrets in a committed .env.example ───────────────────────────
const REAL_SECRET_SHAPES = [
    { what: 'a 64-char hex string (a real AES/HMAC key)', re: /=\s*[0-9a-fA-F]{64}\s*$/m },
    { what: 'an AWS access key id', re: /=\s*AKIA[0-9A-Z]{16}/m },
    { what: 'a private key block', re: /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/ },
];

for (const rel of exampleFiles()) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const { what, re } of REAL_SECRET_SHAPES) {
        if (re.test(src)) {
            structuralFail(rel, `contains what looks like ${what}`, 'A committed secret lives in the git history forever — deleting the line does not remove it. Rotate the value, then replace it here with an obvious placeholder.');
        }
    }
    // Vite inlines every VITE_* var into the bundle, so one is never a secret.
    for (const [, key] of src.matchAll(/^#?\s*(VITE_[A-Z0-9_]*(?:SECRET|KEY|PASSWORD|TOKEN))\s*=/gm)) {
        structuralFail(rel, `declares ${key}`, 'Only VITE_*-prefixed vars reach the browser, and ALL of them do — Vite inlines them into the bundle at build time. A secret named VITE_* is a secret published to every visitor. API URLs and public feature flags only.');
    }
}

// ── F. .env is ignored, .env.example is not ──────────────────────────────────
// Asked of git rather than read out of .gitignore: the answer depends on
// pattern order, negations and every nested .gitignore in the tree, and a regex
// over the top-level file gets that wrong in whichever direction it was written.
{
    const ignored = (rel) => {
        try {
            execFileSync('git', ['check-ignore', '-q', '--no-index', rel], { cwd: ROOT, stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    };

    for (const svc of SERVICES) {
        if (!ignored(svc.local)) {
            structuralFail('.gitignore', `does not ignore \`${svc.local}\``, 'The real env holds live secrets. Committing one publishes every key at once, and deleting the line later does not remove it from the history.');
        }
        if (ignored(svc.example)) {
            structuralFail('.gitignore', `ignores \`${svc.example}\``, 'The file each service documents its keys in has to be committed — otherwise the drift check above silently has nothing to compare against.');
        }
    }
}

/** Every committed `.env.example` in the repo. */
function exampleFiles() {
    const out = [];
    for (const dir of ['.', 'api', 'worker', 'ingestor', 'frontend', 'db']) {
        const rel = dir === '.' ? '.env.example' : `${dir}/.env.example`;
        if (fs.existsSync(path.join(ROOT, rel))) out.push(rel);
    }
    return out;
}

if (structural.length) {
    console.error(`\n✘ ${structural.length} env/config standard violation(s):\n`);
    for (const { file, what, why } of structural) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    failed = true;
}

if (failed) {
    console.error('\nSee env.instructions.md, then re-run.');
    process.exit(1);
}

console.log('\nAll services: env keys in sync.');
if (warned) {
    console.log('Local .env advisories above are warnings only — they do not fail the build.');
}

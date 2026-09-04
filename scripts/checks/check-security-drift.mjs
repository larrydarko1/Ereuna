#!/usr/bin/env node
/**
 * Security-standards drift gate (security.instructions.md).
 *   1.  JWT `verify` calls pin `algorithms`; `sign` calls set `expiresIn`
 *   2.  CORS is never `origin: '*'`
 *   3.  helmet CSP: defaultSrc/objectSrc/frameAncestors locked; script-src has
 *       no `unsafe-inline` / `unsafe-eval`
 *   4.  helmet sends HSTS (max-age ≥ 1y, includeSubDomains) + Permissions-Policy
 *   5.  helmet sets frameguard DENY + noSniff + Referrer-Policy
 *   6.  HSTS `preload` is written explicitly — an opt-in decision, not a default
 *   7.  The refresh cookie is httpOnly + secure + sameSite:strict + scoped path
 *   8.  Argon2 params in config.ts match the DUMMY_HASH used for timing safety
 *   9.  The password schema enforces length + all four character classes
 *   10. No raw-HTML injection sinks in shipped frontend code (innerHTML,
 *       outerHTML, insertAdjacentHTML, document.write) — tests excluded
 *   11. Express `trust proxy` is a numeric hop count, never `true`
 *   12. The NoSQL sanitizer strips unsafe keys from req.query as well as req.body
 *   13. express.json() caps the body size
 *   14. headersTimeout bounds slowloris; requestTimeout is finite
 *   15. The prod dev-placeholder denylist still covers every named substring
 *   16. The login throttle fails OPEN on a Redis outage (warn, never deny)
 *   17. Throttle counters are keyed by a derived identifier, never a raw username
 *   18. Login always runs a hash verify and throws ONE generic 401
 *   19. Refresh rotation: atomic claim, family revocation, inherited ceiling,
 *       hashed at rest
 *   20. Regexes are never built from unescaped user input (ReDoS)
 *   21. The logo route — the one unauthenticated mount — still has the three
 *       controls that stand in for auth
 * Rules the standard states that are gated ELSEWHERE, deliberately not
 * duplicated here (a rule with two owners drifts between them):
 *   - Secrets have no dev default (`requiredSecret`/`hexSecret`) — check-env-drift.mjs
 *   - The Socket.IO handshake mirrors the Express hop count, and the upgrade
 *     checks Origin itself — check-ws-standards.mjs
 *   - Token bucket atomic + fail-open, every mount rate-limited, the pagination
 *     `limit` capped — check-api-standards.mjs
 *   - `securityEvent` on every credential failure — check-error-handling.mjs
 * Rules from the reference implementation that DO NOT APPLY here, so that their
 * absence is a recorded decision rather than an oversight:
 *   - nginx / Traefik header and TLS-floor checks. There is no deployment
 *     manifest in this repo; when one lands, these come back with it.
 *   - `escapeHtml`. Nothing on this server renders HTML — there is no email, no
 *     template, no server-rendered page. The escaping that matters here is
 *     `escapeRegex`, which rule 20 covers.
 *   - Password-reset token handling. There is no email address on an account:
 *     recovery is a single-use code, and `auth-recovery.ts` is gated by the
 *     same refresh-token rules as everything else.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Recursively collect files under `dir` (relative to ROOT) matching `ext`. */
function walk(dir, ext, out = []) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return out;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(rel, ext, out);
        else if (entry.name.endsWith(ext)) out.push(rel);
    }
    return out;
}

/** Return the argument text of every `token(...)` call, paren-balanced. */
function callArgs(src, token) {
    const calls = [];
    let i = 0;
    while ((i = src.indexOf(token, i)) !== -1) {
        let depth = 0;
        let start = i + token.length - 1; // at the '('
        for (let j = start; j < src.length; j++) {
            if (src[j] === '(') depth++;
            else if (src[j] === ')') {
                depth--;
                if (depth === 0) {
                    calls.push(src.slice(start + 1, j));
                    i = j + 1;
                    break;
                }
            }
        }
        if (depth !== 0) break; // unbalanced — bail
    }
    return calls;
}

/**
 * Slice a source file from a function header to the next top-level `export`.
 * Returns '' when the header is absent, which every caller treats as a failure
 * — a check that silently examined an empty string would always pass.
 */
function fnBody(src, header) {
    const start = src.indexOf(header);
    if (start === -1) return '';
    const next = src.indexOf('\nexport ', start + header.length);
    return src.slice(start, next === -1 ? src.length : next);
}

/** Body of the first block whose opening `{` is matched by `opener`, brace-balanced. */
function braceBlock(src, opener) {
    const m = src.match(opener);
    if (m?.index === undefined) return '';
    const open = src.indexOf('{', m.index + m[0].length - 1);
    let depth = 0;
    for (let j = open; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}' && --depth === 0) return src.slice(open + 1, j);
    }
    return '';
}

/** Return the body text of every `catch (…) { … }` block, brace-balanced. */
function catchBodies(src) {
    const out = [];
    const re = /catch\s*(?:\([^)]*\))?\s*\{/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const open = m.index + m[0].length - 1;
        let depth = 0;
        for (let j = open; j < src.length; j++) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') {
                depth--;
                if (depth === 0) {
                    out.push(src.slice(open + 1, j));
                    re.lastIndex = j;
                    break;
                }
            }
        }
    }
    return out;
}

/** Evaluate a literal arithmetic product like `2 * 60 * 60 * 1000`. */
const evalProduct = (expr) => (expr ?? '').split('*').reduce((a, n) => a * Number(n.trim()), 1);

/** Strip `//` and block comments so a rule never fires on prose about itself. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Extract helmet's CSP `script-src` token list. */
function scriptSrcClean(text) {
    return !/unsafe-inline|unsafe-eval/.test(text.match(/scriptSrc\s*:\s*\[([^\]]*)\]/)?.[1] ?? '');
}


// ─── Anchor preflight ─────────────────────────────────────────────────────────
// Every rule below reads a landmark out of a named file. If one moves, the rule
// that depends on it stops testing anything and passes — so the landmarks are
// asserted first, and a missing one is a hard stop rather than a green tick.
const ANCHORS = [
    { file: 'api/src/index.ts', contains: ['helmet(', 'cors(', 'Permissions-Policy', 'strictTransportSecurity'] },
    { file: 'api/src/routes/identity/auth.ts', contains: ['function setRefreshCookie'] },
    { file: 'api/src/routes/asset/logos.ts', contains: ['function isSameOrigin', 'sendFile'] },
    { file: 'api/src/lib/config.ts', contains: ['argon2:', 'memoryCost'] },
    { file: 'api/src/services/auth/auth-tokens.ts', contains: ['DUMMY_HASH', 'export async function loginUser'] },
    { file: 'api/src/utils/regex.ts', contains: ['function escapeRegex'] },
    { file: 'api/src/lib/schemas.ts', contains: ['passwordSchema'] },
    { file: 'api/src/middleware/sanitizer.ts', contains: ['export function sanitizeRequest'] },
    { file: 'api/src/services/auth/login-throttle.ts', contains: ['export async function assertLoginAllowed'] },
    { file: 'packages/shared/src/config/env.ts', contains: ['DEV_PLACEHOLDERS'] },
];

const anchorFailures = [];
for (const a of ANCHORS) {
    const abs = path.join(ROOT, a.file);
    if (!fs.existsSync(abs)) {
        anchorFailures.push(`${a.file} — file not found (moved or renamed?)`);
        continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    for (const token of a.contains) {
        if (!src.includes(token)) anchorFailures.push(`${a.file} — missing landmark \`${token}\``);
    }
}
if (anchorFailures.length > 0) {
    console.error('✘ Security gate assumptions broke — a security-relevant file moved or was refactored.');
    console.error('  The drift checker can no longer locate what it validates. Confirm the control still');
    console.error('  exists, then update the paths/landmarks in scripts/checks/check-security-drift.mjs:');
    for (const f of anchorFailures) console.error(`    - ${f}`);
    process.exit(1);
}

/** Each returns { name, ok, detail }. */
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

const entry = read('api/src/index.ts');
const backend = [...walk('api/src', '.ts'), ...walk('worker/src', '.ts'), ...walk('ingestor/src', '.ts')].filter(
    (f) => !f.includes('__tests__'),
);

// –– 1. JWT algorithm pinning + token expiry ––––––––––––––––––––––––––––––––––
{
    const unpinned = [];
    const unexpired = [];
    for (const f of backend) {
        const src = read(f);
        for (const args of callArgs(src, 'jwt.verify(')) {
            if (!/algorithms\s*:/.test(args)) unpinned.push(f);
        }
        for (const args of callArgs(src, 'jwt.sign(')) {
            if (!/expiresIn\s*:/.test(args)) unexpired.push(f);
        }
    }
    add('JWT verify() pins `algorithms`', unpinned.length === 0, unpinned.length ? `unpinned in: ${[...new Set(unpinned)].join(', ')}` : '');
    add('JWT sign() sets `expiresIn`', unexpired.length === 0, unexpired.length ? `no expiry in: ${[...new Set(unexpired)].join(', ')}` : '');
}

// –– 2. CORS never wildcard ––––––––––––––––––––––––––––––––––––––––––––––––––
{
    const wildcard = /origin\s*:\s*['"]\*['"]/.test(entry);
    const usesConfig = /cors\(\s*\{[\s\S]*?origin\s*:\s*config\.corsOrigin/.test(entry);
    add('CORS origin is the configured allowlist, not `*`', !wildcard && usesConfig);
}

// –– 3–4. helmet CSP + HSTS + Permissions-Policy –––––––––––––––––––––––––––––
{
    add(
        'helmet CSP locks defaultSrc/objectSrc/frameAncestors',
        /defaultSrc:\s*\["'self'"\]/.test(entry) && /objectSrc:\s*\["'none'"\]/.test(entry) && /frameAncestors:\s*\["'none'"\]/.test(entry),
    );
    add('helmet CSP script-src has no unsafe-inline/eval', scriptSrcClean(entry));
    add(
        'helmet sends HSTS (≥1y, includeSubDomains)',
        /strictTransportSecurity\s*:\s*\{[\s\S]*?maxAge:\s*([\d_]+)[\s\S]*?includeSubDomains:\s*true/.test(entry) &&
            Number((entry.match(/maxAge:\s*([\d_]+)/)?.[1] ?? '0').replace(/_/g, '')) >= 31_536_000,
    );
    add('Permissions-Policy header is set', /Permissions-Policy/.test(entry));
}

// –– 5. The three fixed headers –––––––––––––––––––––––––––––––––––––––––––––––
{
    const missing = [];
    if (!/frameguard:\s*\{\s*action:\s*['"]deny['"]/.test(entry)) missing.push("frameguard: { action: 'deny' }");
    if (!/noSniff:\s*true/.test(entry)) missing.push('noSniff: true');
    if (!/referrerPolicy:\s*\{\s*policy:\s*['"](?:strict-origin-when-cross-origin|no-referrer)['"]/.test(entry)) {
        missing.push('referrerPolicy: strict-origin-when-cross-origin | no-referrer');
    }
    add('helmet explicitly sets frameguard/noSniff/Referrer-Policy', missing.length === 0, missing.join(', '));
}

// –– 6. HSTS `preload` is written down either way –––––––––––––––––––––––––––––
{
    const block = entry.match(/strictTransportSecurity\s*:\s*\{([\s\S]*?)\n {8}\}/)?.[1] ?? '';
    add(
        'HSTS `preload` is an explicit true/false, not left to the default',
        /preload:\s*(?:true|false)/.test(block),
        block === '' ? 'no strictTransportSecurity block found' : 'add `preload: false` (or true) to record the decision',
    );
}

// –– 7. Refresh cookie flags ––––––––––––––––––––––––––––––––––––––––––––––––––
{
    const src = read('api/src/routes/identity/auth.ts');
    const fn = src.slice(src.indexOf('function setRefreshCookie'));
    const ok = /httpOnly:\s*true/.test(fn) && /sameSite:\s*['"]strict['"]/.test(fn) && /secure:/.test(fn) && /path:\s*REFRESH_COOKIE_PATH|path:\s*['"]\/api\/auth['"]/.test(fn);
    add('Refresh cookie: httpOnly + secure + sameSite:strict + scoped path', ok);
}

// –– 8. Argon2 params ↔ DUMMY_HASH (the audit-prone cross-file invariant) –––––
{
    const cfg = read('api/src/lib/config.ts');
    const mem = evalProduct(cfg.match(/memoryCost:\s*([0-9*\s]+?)\s*,/)?.[1] ?? '0');
    const time = Number(cfg.match(/timeCost:\s*(\d+)/)?.[1] ?? 0);
    const par = Number(cfg.match(/parallelism:\s*(\d+)/)?.[1] ?? 0);

    // argon2 writes the parameters in whatever order it likes, so they are read
    // by name rather than by position — a positional match would break on a
    // hash that is entirely correct.
    const dummy = read('api/src/services/auth/auth-tokens.ts');
    const encoded = dummy.match(/\$argon2id\$v=19\$([^$]+)\$/)?.[1] ?? '';
    const fields = Object.fromEntries([...encoded.matchAll(/([mtp])=(\d+)/g)].map((f) => [f[1], Number(f[2])]));
    const ok = fields.m === mem && fields.t === time && fields.p === par;
    add(
        'Argon2 config params match the timing-safe DUMMY_HASH',
        ok,
        ok ? '' : `config m=${mem},t=${time},p=${par} vs hash m=${fields.m},t=${fields.t},p=${fields.p} — regenerate DUMMY_HASH`,
    );
}

// –– 9. Password schema: length + four character classes ––––––––––––––––––––––
{
    const src = read('api/src/lib/schemas.ts');
    const fn = src.slice(src.indexOf('passwordSchema'));
    const ok = /length\s*<\s*8/.test(fn) && /length\s*>\s*128/.test(fn) && /\[A-Z\]/.test(fn) && /\[a-z\]/.test(fn) && /\[0-9\]/.test(fn) && /\[\^A-Za-z0-9\]/.test(fn);
    add('Password schema enforces length + 4 character classes', ok);
}

// –– 10. No raw-HTML injection sinks in SHIPPED frontend code –––––––––––––––––
{
    const files = [...walk('frontend/src', '.ts'), ...walk('frontend/src', '.vue')].filter(
        (f) => !f.includes('__tests__') && !f.startsWith(path.join('frontend/src/lib/lightweight-charts')),
    );
    const SINKS = [
        { what: '.innerHTML =', re: /\.innerHTML\s*=/ },
        { what: '.outerHTML =', re: /\.outerHTML\s*=/ },
        { what: '.insertAdjacentHTML(', re: /\.insertAdjacentHTML\s*\(/ },
        { what: 'document.write(', re: /document\.write(ln)?\s*\(/ },
        { what: 'v-html', re: /\sv-html[=\s]/ },
    ];
    const hits = [];
    for (const f of files) {
        const src = read(f);
        for (const { what, re } of SINKS) {
            if (re.test(src)) hits.push(`${f} (${what})`);
        }
    }
    add('No raw-HTML injection sinks in shipped frontend code', hits.length === 0, hits.join(', '));
}

// –– 11. `trust proxy` is a hop COUNT, never `true` –––––––––––––––––––––––––––
{
    const arg = entry.match(/app\.set\(\s*['"]trust proxy['"]\s*,\s*([^)]+?)\s*\)/)?.[1];
    add(
        'Express `trust proxy` is the numeric hop count, never `true`',
        arg === 'config.trustProxyHops',
        arg === undefined ? "`app.set('trust proxy', …)` not found in api/src/index.ts" : `set to \`${arg}\` — must be \`config.trustProxyHops\` (a validated number)`,
    );
    add(
        'TRUST_PROXY_HOPS is validated as a non-negative integer',
        /TRUST_PROXY_HOPS:\s*z\.coerce\.number\(\)[\s\S]{0,80}?\.int\(\)[\s\S]{0,40}?\.nonnegative\(\)/.test(read('api/src/lib/config.ts')),
        'a hop count that parses as NaN or a boolean defeats the whole control',
    );
}

// –– 12. The key sanitizer covers req.query, not just req.body –––––––––––––––––
{
    const src = read('api/src/middleware/sanitizer.ts');
    const fn = fnBody(src, 'export function sanitizeRequest');
    const covers = (target) => new RegExp(`stripUnsafeKeys\\w*\\(\\s*(?:req\\.${target}|req\\.${target}\\b)`).test(fn);
    const missing = ['body', 'query'].filter((t) => !covers(t));
    add(
        'NoSQL sanitizer strips unsafe keys from BOTH req.body and req.query',
        fn !== '' && missing.length === 0,
        fn === '' ? 'sanitizeRequest() not found' : `req.${missing.join(' and req.')} is never passed to a strip function`,
    );
    add(
        'The sanitizer filters on a leading `$` and the prototype-pollution keys',
        /startsWith\(\s*['"]\$['"]\s*\)/.test(src) && /__proto__/.test(src),
        'the strip helpers no longer test for the `$` prefix, or dropped the prototype keys',
    );
}

// –– 13. Body-size cap on the JSON parser –––––––––––––––––––––––––––––––––––––
{
    const raw = entry.match(/express\.json\(\s*\{[^}]*limit:\s*['"]([^'"]+)['"]/)?.[1];
    const bytes = raw === undefined ? 0 : Number(raw.replace(/[a-z]+$/i, '')) * (/mb$/i.test(raw) ? 1024 * 1024 : /kb$/i.test(raw) ? 1024 : 1);
    add(
        'express.json() caps the request body (≤ 10 MB)',
        bytes > 0 && bytes <= 10 * 1024 * 1024,
        raw === undefined ? 'no `limit` passed to express.json()' : `limit is \`${raw}\` — the standard caps JSON bodies at 10 MB`,
    );
}

// –– 14. Protocol-attack timeouts –––––––––––––––––––––––––––––––––––––––––––––
{
    const headers = Number((entry.match(/server\.headersTimeout\s*=\s*([0-9_]+)/)?.[1] ?? '0').replace(/_/g, ''));
    add(
        'headersTimeout bounds slowloris (set, ≤ 60 s)',
        headers > 0 && headers <= 60_000,
        headers === 0 ? 'server.headersTimeout is not set' : `set to ${headers} ms`,
    );
    const requestExpr = entry.match(/server\.requestTimeout\s*=\s*([0-9_*\s]+);/)?.[1];
    const request = evalProduct(requestExpr?.replace(/_/g, ''));
    add(
        'requestTimeout is finite (slow POST)',
        request > 0,
        requestExpr === undefined ? 'server.requestTimeout is not set — Node then applies its own default' : 'set to 0, which disables the timeout entirely',
    );
}

// –– 15. The prod dev-placeholder denylist ––––––––––––––––––––––––––––––––––––
{
    const src = read('packages/shared/src/config/env.ts');
    const list = src.match(/DEV_PLACEHOLDERS\s*=\s*\[([^\]]*)\]/)?.[1] ?? '';
    const REQUIRED = ['dev_secret', 'change', 'replace-me', 'your-'];
    const missing = REQUIRED.filter((p) => !list.includes(`'${p}'`));
    add(
        'Prod dev-placeholder denylist covers every named substring',
        list !== '' && missing.length === 0,
        list === '' ? 'DEV_PLACEHOLDERS array not found' : `missing: ${missing.join(', ')}`,
    );
    add(
        'requiredSecret() applies the denylist in production only',
        /isProd\(\)[\s\S]{0,40}DEV_PLACEHOLDERS\.some/.test(src),
        'the placeholder refine no longer consults DEV_PLACEHOLDERS behind a prod guard',
    );
}

// –– 16. The login throttle fails OPEN ––––––––––––––––––––––––––––––––––––––––
{
    const src = read('api/src/services/auth/login-throttle.ts');
    const problems = [];
    for (const name of ['assertLoginAllowed', 'recordLoginFailure', 'clearLoginFailures']) {
        const fn = fnBody(src, `export async function ${name}`);
        if (fn === '') {
            problems.push(`${name}() not found`);
            continue;
        }
        const catches = catchBodies(fn);
        if (catches.length === 0) problems.push(`${name}() has no catch around its Redis call`);
        for (const body of catches) {
            if (/\bthrow\b/.test(body)) problems.push(`${name}() rethrows from its catch (fails closed)`);
            if (!/logger\.(warn|error)\(/.test(body)) problems.push(`${name}() swallows the Redis error without logging`);
        }
    }
    add('Login throttle fails OPEN on a Redis outage (warn, never deny)', problems.length === 0, problems.join('; '));
}

// –– 17. Throttle counters are keyed by a DERIVED identifier ––––––––––––––––––
{
    // The hazard is the raw credential reaching Redis, where it outlives the
    // request in a key an operator can read. A local `const key =
    // throttleKey(username)` is the sanctioned shape, so the check follows the
    // binding rather than trusting the name.
    const RAW = /^(username|email|user|req\.|['"`])/;
    const bad = [];
    for (const f of backend) {
        const src = read(f);
        for (const call of ['assertLoginAllowed', 'recordLoginFailure', 'clearLoginFailures']) {
            for (const args of callArgs(src, `${call}(`)) {
                const arg = args.trim();
                if (arg === '' || /^key: string/.test(arg)) continue;
                const derived = new RegExp(`\\b${arg}\\s*=\\s*throttleKey\\(`).test(src);
                if (!derived && RAW.test(arg)) bad.push(`${f}: ${call}(${arg})`);
            }
        }
    }
    add(
        'Login throttle is keyed by a derived identifier, never a raw username',
        bad.length === 0,
        bad.length ? `${bad.join(', ')} — key by throttleKey(username)` : '',
    );
}

// –– 18. Login is timing-uniform and answers with ONE generic error –––––––––––
{
    const src = read('api/src/services/auth/auth-tokens.ts');
    const fn = fnBody(src, 'export async function loginUser');
    const verifyAt = fn.search(/argon2\.verify\(/);
    const branchAt = fn.search(/if\s*\(\s*user\s*===?\s*null/);
    add(
        'Login verifies against DUMMY_HASH before branching on user existence',
        /\?\?\s*DUMMY_HASH/.test(fn) && verifyAt !== -1 && branchAt > verifyAt,
        verifyAt === -1 ? 'no argon2.verify() in loginUser()' : 'the unknown-username path skips the hash verify — timing reveals the account',
    );
    const codes = [...fn.matchAll(/new AppError\(\s*401\s*,\s*'([A-Z_]+)'/g)].map((m) => m[1]);
    add(
        'Login returns one generic 401 for both unknown-user and wrong-password',
        new Set(codes).size === 1,
        codes.length === 0 ? 'no 401 thrown from loginUser()' : `distinct codes: ${[...new Set(codes)].join(', ')}`,
    );
}

// –– 19. Refresh rotation: atomic claim, family revocation, inherited ceiling ––
{
    const src = read('api/src/services/auth/auth-tokens.ts');
    const fn = fnBody(src, 'export async function rotateRefreshToken');
    add(
        'Rotation claims the old token atomically (single-use)',
        /findOneAndUpdate\(\s*\{[^}]*tokenHash[\s\S]{0,80}?\$exists:\s*false/.test(fn),
        'two concurrent refreshes can both succeed without a conditional claim',
    );
    const reuseBranch = braceBlock(fn, /if\s*\(\s*record\s*===?\s*null\s*\)\s*\{/);
    add(
        'Reuse of a rotated-out token revokes the whole family',
        reuseBranch !== '' && /deleteMany\([^;]*familyId/.test(reuseBranch),
        reuseBranch === '' ? 'no `if (record === null)` reuse-detection branch in rotateRefreshToken()' : 'the reuse branch revokes less than the family — a replayed token must end that session everywhere',
    );
    const issues = callArgs(fn, 'issueRefreshToken(');
    add(
        'Rotation inherits the absolute session ceiling',
        issues.length > 0 && issues.every((args) => /\bexpiresAt:\s*record\.expiresAt\b/.test(args)) && !/new Date\(\s*Date\.now\(\)\s*\+/.test(fn),
        'the rotate path mints a new expiry — the session ceiling becomes a sliding window',
    );
    // `sha256(rawToken)` is stripped before the search: the raw name legitimately
    // appears INSIDE the hash call, and a naive scan reads that as storing it.
    const stored = src.replace(/sha256\([^)]*\)/g, 'HASHED');
    add(
        'Refresh tokens are stored hashed, never raw',
        /tokenHash:\s*sha256\(/.test(src) && !/insertOne\(\s*\{[^}]*\brawToken\b/.test(stored),
        'a database read must not yield usable refresh tokens',
    );
}

// –– 20. No regex built from unescaped user input –––––––––––––––––––––––––––––
{
    const files = [...backend, ...walk('packages/shared/src', '.ts')].filter((f) => !f.includes('__tests__'));
    const bad = [];
    for (const f of files) {
        const src = stripComments(read(f));

        for (const args of callArgs(src, 'new RegExp(')) {
            const pattern = args.trim();
            const isLiteral = /^(['"]).*\1\s*(?:,|$)/s.test(pattern);
            if (isLiteral || pattern.includes('escapeRegex(')) continue;
            // Template literal: every interpolation must be a `{…}` quantifier slot.
            const slots = [...pattern.matchAll(/\$\{[^}]*\}/g)];
            const quantifiedOnly =
                pattern.startsWith('`') && slots.length > 0 && slots.every((s) => pattern[s.index - 1] === '{' && pattern[s.index + s[0].length] === '}');
            if (!quantifiedOnly) bad.push(`${f}: new RegExp(${pattern.slice(0, 40)}…)`);
        }

        for (const m of src.matchAll(/\$regex:\s*([^,}\n]+)/g)) {
            const value = m[1].trim();
            if (/^['"`]/.test(value) || value.includes('escapeRegex(')) continue;
            const name = /^[A-Za-z_$][\w$]*$/.test(value) ? value : null;
            const bound = name !== null && new RegExp(`\\b${name}\\s*=\\s*[^;\\n]*(?:escapeRegex\\(|new RegExp\\()`).test(src);
            if (!bound) bad.push(`${f}: $regex: ${value.slice(0, 40)}`);
        }
    }
    add('Regexes are never built from unescaped user input', bad.length === 0, bad.join('; '));
}

// –– 21. The one unauthenticated mount keeps its stand-in controls ––––––––––––
{
    const src = read('api/src/routes/asset/logos.ts');
    // `/api/auth` is the credential surface — login and register cannot require
    // a token to obtain one — so the invariant is that it and the logo route are
    // the ONLY two mounts without `requireAuth`. A third is a data route that
    // lost its guard, and it looks exactly like the ten lines above it.
    const OPEN_BY_DESIGN = ['/api/auth', '/api/logos'];
    const mounted = [...entry.matchAll(/app\.use\(\s*'(\/api\/[^']*)'[^\n]*\)/g)]
        .filter((m) => !m[0].includes('requireAuth'))
        .map((m) => m[1]);
    const unexpected = mounted.filter((m) => !OPEN_BY_DESIGN.includes(m));
    const absent = OPEN_BY_DESIGN.filter((m) => !mounted.includes(m));
    add(
        'Only /api/auth and /api/logos are mounted without requireAuth',
        unexpected.length === 0 && absent.length === 0,
        [unexpected.length ? `also unauthenticated: ${unexpected.join(', ')}` : '', absent.length ? `expected but not found: ${absent.join(', ')}` : '']
            .filter(Boolean)
            .join('; '),
    );
    add(
        'The logo route allow-lists both path segments',
        /exchange:\s*z\.string\(\)\.regex\(/.test(src) && /file:\s*z\.string\(\)\.regex\(/.test(src),
        'a pattern that cannot express a separator or a dot segment is what makes traversal unreachable before sendFile is even asked',
    );
    add(
        "The logo route confines sendFile to `root` and denies dotfiles",
        /root:\s*config\.logos\.dir/.test(src) && /dotfiles:\s*'deny'/.test(src),
        'root confinement is the second of the three controls that stand in for authentication here',
    );
    add(
        'The logo route checks the request origin',
        /isSameOrigin\(req\)/.test(src) && /config\.corsOrigin/.test(src),
        'the third control: an <img> carries no token, so the origin is what distinguishes the app from a scraper',
    );
    add(
        'SVG responses are sandboxed by CSP',
        /Content-Security-Policy/.test(src) && /sandbox/.test(src),
        'an SVG served from this origin is a document, not a picture — it runs whatever it contains unless the response forbids it',
    );
}

// ─── Report ───────────────────────────────────────────────────────────────────
let failed = false;
for (const c of checks) {
    if (c.ok) {
        console.log(`✔ ${c.name}`);
    } else {
        failed = true;
        console.error(`✘ ${c.name}${c.detail ? `\n    ${c.detail}` : ''}`);
    }
}

if (failed) {
    console.error('\nSecurity drift detected — fix the items above (see security.instructions.md), then re-run.');
    process.exit(1);
}
console.log(`\nAll ${checks.length} security invariants hold.`);

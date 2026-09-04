#!/usr/bin/env node
/**
 * Error-handling gate (error-handling.instructions.md).
 *   1. THE STATUS POLICY. `new AppError(400, 'COLLECTION_FULL')` is a perfectly
 *      well-typed call — the table that says a full collection is a 422, not a
 *      400, exists only in prose. This repo had drifted 70 throws onto 400
 *      against 2 on 422, and nothing anywhere could notice.
 *   2. THE AppError SHAPE. Three required positionals, then one options object
 *      carrying `params, logContext, securityEvent` — one goes on the wire, two
 *      do not. They used to be the 4th/5th/6th positional arguments, and the
 *      hazard then was that `params` and `logContext` are both
 *      `Record<string, string | number>`: swapping them typechecked silently and
 *      served every structured log field (`op`, `userId`, `attempt`) to clients.
 *      Naming them killed that class of bug outright — you cannot transpose two
 *      named fields — so this now pins the shape rather than the order, and the
 *      reason the shape matters is that the error handler reads these three
 *      fields by name and a missing one goes quiet instead of loud.
 *   3. ONE BOUNDARY, MOUNTED LAST. Express identifies an error handler purely
 *      by arity, and a 4-arg middleware registered before a route simply never
 *      runs. Nothing fails; errors just become unhandled 500s.
 *   4. THE CODE CONTRACT. A code with no translation reaches a user as
 *      SCREAMING_SNAKE. The locale parity test covers the forward direction;
 *      this covers the rest — orphaned translations, unused codes, casing —
 *      and fails in seconds without booting vitest.
 *   5. WHICH FAILURES ARE SECURITY EVENTS. `securityEvent` is an explicit flag
 *      precisely because status can't imply it, which also means forgetting it
 *      is invisible: a brute-forced recovery code logs like an expired session.
 *   6. WHAT `params` MAY CARRY. `params` ride on the wire next to the code.
 *      User input in them is a reflected-XSS vector; the same input in
 *      `message` is fine. Same type, opposite rules — position is the contract.
 *   7. THE NON-HTTP BOUNDARIES. BullMQ has no middleware: a Worker without a
 *      `failed` handler drops its failures silently, and `AppError` (a status
 *      code and an Express handler) means nothing out there.
 *   8. THE FRONTEND END OF THE CONTRACT. Bare codes on the wire are only safe
 *      because exactly one interceptor translates them and falls back for the
 *      ones it doesn't know.
 *   9. SWALLOWS STATE A REASON. `no-empty` already rejects `catch {}`; what it
 *      can't ask is why a server-side failure is being dropped on the floor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';
import { stripComments } from '../lib/strip-comments.mjs';

const APP_ERROR = 'api/src/lib/app-error.ts';
const HANDLER = 'api/src/middleware/error-handler.ts';
const CODES = 'packages/shared/src/errors.ts';
const ENTRY = 'api/src/index.ts';
const CLIENT = 'frontend/src/api/client.ts';
const LOCALE_DIR = 'frontend/src/locales';

const ALLOWED_STATUS = new Set([400, 401, 403, 404, 409, 413, 422, 429, 500]);
/**
 * Codes that legitimately answer 400 — a request that never parsed. Empty: this
 * API takes no multipart uploads and no free-form JSON blobs, so every
 * malformed request is caught by Zod and answered 422 by the error handler.
 */
const PARSE_LEVEL_400 = new Set([]);

/**
 * Codes that must be thrown with `securityEvent: true`, BY NAME.
 * The standard's categories: failed logins, missing/invalid tokens, privilege
 * denials, throttle lockouts. Expiry is deliberately absent — an expired
 * session, reset link or verification link is routine, and the flag exists so
 * routine 401/403s do NOT collect ip/user-agent.
 * Patterns rather than a list, because a list only knows about codes that
 * already exist. That is not hypothetical: the first version of this gate WAS
 * a hand-written list, and `INVALID_AUTH_CODE` — flagged correctly in source
 * since the day it was written — was missing from it. The gate was green, and
 * would have stayed green if someone had dropped the flag. Anything shaped like
 * a credential check now enrols itself the moment it is named.
 */
const SECURITY_EVENT_PATTERNS = [
    /^INCORRECT_/,
    /_REQUIRED$/,
    /^(MISSING|INVALID)_.*(TOKEN|CREDENTIALS?|PASSWORD|RECOVERY_CODE|2FA_CODE|AUTH_CODE)/,
    /_TOKEN_INVALID$/,
];

/**
 * Security events whose names carry no signal, so no pattern can reach them.
 * Keep this short: a name that has to be listed here is usually a name that
 * could say what it means instead.
 */
const SECURITY_EVENT_CODES = new Set([
    'FORBIDDEN', // the logo route: a request from another origin
]);

/**
 * Escape hatch for a future code that matches a pattern but is genuinely
 * routine. Empty today — every current match is a real credential failure —
 * but the alternative to having it is loosening a regex for everything.
 */
const NOT_SECURITY_EVENTS = new Set([]);

/** True when a code must carry `securityEvent: true`. */
const isSecurityEvent = (c) =>
    !NOT_SECURITY_EVENTS.has(c) && (SECURITY_EVENT_CODES.has(c) || SECURITY_EVENT_PATTERNS.some((p) => p.test(c)));

/**
 * The two sanctioned emitters of a code without going through AppError, plus
 * the error handler — which is the response boundary itself, so "does not throw
 * AppError" is its whole job rather than an exception to it.
 */
const DIRECT_CODE_EMITTERS = ['api/src/middleware/validate.ts', 'api/src/lib/rate-limiters.ts', HANDLER];

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const code = (rel) => stripComments(read(rel));
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

const backendFiles = [...walk('api/src', isTs), ...walk('worker/src', isTs), ...walk('ingestor/src', isTs)].filter(
    (f) => !f.includes('__tests__'),
);

/** Every code in the shared contract, in declaration order. */
const allCodes = [
    ...(/export const ERROR_CODES = \[([\s\S]*?)\] as const;/.exec(read(CODES))?.[1] ?? '').matchAll(/'([^']+)'/g),
].map((m) => m[1]);

// ── 1. Every AppError throw obeys the status policy ─────────────────────────
const throws = [];
for (const rel of walk('api/src', isTs)) {
    if (rel.includes('__tests__')) continue;
    const src = code(rel);
    for (const m of src.matchAll(/new AppError\(/g)) {
        const args = callArguments(src, m.index + m[0].length - 1);
        if (args === null) continue;
        const status = Number(args[0]?.trim());
        const errorCode = /^'([A-Z0-9_]+)'$/.exec(args[1]?.trim() ?? '')?.[1] ?? null;
        throws.push({ rel, line: lineOf(src, m.index), status, errorCode, args });
    }
}

for (const t of throws) {
    if (!Number.isInteger(t.status)) {
        fail(`${t.rel}:${t.line}`, 'AppError status is not a literal', 'Pass the status as a number literal — a computed status can’t be checked against the policy table, and this is the one place the table is enforced.');
        continue;
    }
    if (!ALLOWED_STATUS.has(t.status)) {
        fail(`${t.rel}:${t.line}`, `status ${t.status} is not in the policy table`, `Use one of ${[...ALLOWED_STATUS].join(', ')} — see the status code policy. 413 comes from Multer via the error handler; 502/503 are infrastructure responses, not client-facing throws.`);
    }
    if (t.status === 400 && t.errorCode !== null && !PARSE_LEVEL_400.has(t.errorCode)) {
        fail(`${t.rel}:${t.line}`, `400 for \`${t.errorCode}\``, '400 is for a request that never parsed; a well-formed request carrying invalid data is 422. If this really is a parse-level failure, add the code to PARSE_LEVEL_400 in this gate with a note.');
    }
    if (t.status === 422 && t.errorCode !== null && PARSE_LEVEL_400.has(t.errorCode)) {
        fail(`${t.rel}:${t.line}`, `422 for parse-level \`${t.errorCode}\``, 'This code is listed as parse-level, which is a 400. Either throw 400 or drop it from PARSE_LEVEL_400 in this gate.');
    }
}

// ── 1b. A code means one thing: one code, one status ────────────────────────
{
    const statusOf = new Map();
    for (const t of throws) {
        if (t.errorCode === null || !Number.isInteger(t.status)) continue;
        if (!statusOf.has(t.errorCode)) statusOf.set(t.errorCode, new Map());
        const seen = statusOf.get(t.errorCode);
        seen.set(t.status, [...(seen.get(t.status) ?? []), `${t.rel}:${t.line}`]);
    }
    for (const [errorCode, seen] of statusOf) {
        if (seen.size === 1) continue;
        const ranked = [...seen].sort((a, b) => b[1].length - a[1].length);
        const [majority] = ranked;
        for (const [status, sites] of ranked.slice(1)) {
            for (const site of sites) {
                fail(site, `\`${errorCode}\` is thrown as ${status} here but ${majority[0]} in ${majority[1].length} other place(s)`, `A code is a contract the frontend switches on; its status is a property of the code, not of the call site. Use ${majority[0]}, or split this case out into its own code if it genuinely means something different.`);
            }
        }
    }
}

// ── 2. The AppError class carries the documented fields, in order ───────────
{
    if (!exists(APP_ERROR)) {
        fail(APP_ERROR, 'missing', 'One AppError class is the only way to raise a client-facing HTTP error.');
    } else {
        const src = code(APP_ERROR);
        if (!/class AppError extends Error/.test(src)) {
            fail(APP_ERROR, 'AppError does not extend Error', 'A thrown plain object has no stack trace and no `instanceof` narrowing, and loggers won’t serialise it.');
        }
        for (const field of ['status', 'code', 'params', 'logContext', 'securityEvent']) {
            if (!new RegExp(`readonly ${field}[?]?:`).test(src)) {
                fail(APP_ERROR, `no readonly \`${field}\` field`, 'The five fields are the contract with the error handler; a missing one silently stops being logged or sent.');
            }
        }
        if (!/code:\s*ErrorCode/.test(src)) {
            fail(APP_ERROR, '`code` is not typed as ErrorCode', 'Typing it as the shared union is what makes a typo a compile error and guarantees every code that compiles has a translation.');
        }
        const ctor = /constructor\(([\s\S]*?)\)\s*\{/.exec(src)?.[1] ?? '';
        const names = (callArguments(`(${ctor})`, 0) ?? [])
            .map((param) => /^\s*(\w+)/.exec(param)?.[1])
            .filter((name) => name !== undefined);
        const expected = ['status', 'code', 'message', 'options'];
        if (names.join(',') !== expected.join(',')) {
            fail(APP_ERROR, `constructor parameters are (${names.join(', ')})`, `Must be (${expected.join(', ')}). The three required values are positional; everything optional is named inside \`options\`, so no call site ever passes \`undefined\` to reach the argument it wants.`);
        }
        for (const field of ['params', 'logContext', 'securityEvent']) {
            if (!new RegExp(`\\b${field}\\?:`).test(src)) {
                fail(APP_ERROR, `\`AppErrorOptions\` has no \`${field}\` field`, 'The three optional fields are the contract with the error handler; a missing one silently stops being logged or sent.');
            }
        }
    }
}

// ── 3. One error handler, four arguments, mounted last, ordered ─────────────
{
    const src = code(HANDLER);
    const sig = /export function errorHandler\(([\s\S]*?)\)\s*:/.exec(src)?.[1] ?? '';
    const arity = sig.split(',').filter((s) => s.trim() !== '').length;
    if (arity !== 4) {
        fail(HANDLER, `errorHandler takes ${arity} argument(s)`, 'Express identifies an error handler ONLY by its 4-argument (err, req, res, next) signature. With any other arity it is registered as ordinary middleware and never sees an error.');
    }
    // No Multer branch: this API takes no uploads, so the only two typed
    // failures that reach the boundary are a deliberate throw and a Zod parse.
    const order = ['AppError', 'ZodError'].map((n) => src.indexOf(`err instanceof ${n}`));
    if (order.some((i) => i === -1)) {
        fail(HANDLER, 'a documented branch is missing', 'The handler must map AppError and ZodError before falling through to 500 INTERNAL.');
    } else if (order[0] > order[1]) {
        fail(HANDLER, 'branches are out of order', 'AppError → ZodError → generic. AppError is the intentional path and the most frequent; the generic branch is the safety net and must stay last.');
    }
    if (!/res\.status\(500\)\.json\(\{\s*error:\s*'INTERNAL'\s*\}\)/.test(src)) {
        fail(HANDLER, 'the fallback branch does not answer 500 INTERNAL', 'Anything unrecognised is a bug: log it in full and return the generic code, never the error itself.');
    }
    if (/res\.[\s\S]{0,40}\berr\.stack\b/.test(src)) {
        fail(HANDLER, 'a stack trace reaches the response', 'Stacks are logged, never sent.');
    }
    const entry = code(ENTRY);
    const uses = [...entry.matchAll(/app\.use\(/g)].map((m) => m.index);
    const mount = entry.indexOf('app.use(errorHandler)');
    if (mount === -1) {
        fail(ENTRY, 'errorHandler is never mounted', 'Register it with app.use(errorHandler) after all routes.');
    } else if (uses.some((i) => i > mount)) {
        const after = lineOf(entry, uses.filter((i) => i > mount)[0]);
        fail(ENTRY, `app.use() at line ${after} runs after errorHandler`, 'The error handler must be the LAST app.use(). Anything mounted after it is unreachable from an error, and the routes it registers throw into nothing.');
    }
}

// ── 4. The shared error-code contract ───────────────────────────────────────
{
    const codes = allCodes;

    if (codes.length === 0) {
        fail(CODES, 'no ERROR_CODES array found', 'One `as const` array is the single source of truth for the API ↔ frontend contract.');
    }
    for (const c of codes) {
        if (!/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(c)) {
            fail(CODES, `\`${c}\` is not SCREAMING_SNAKE_CASE`, 'Codes are a shipped contract; the casing is part of it.');
        }
    }
    for (const c of codes.filter((c, i) => codes.indexOf(c) !== i)) {
        fail(CODES, `\`${c}\` is listed twice`, 'A duplicate hides the fact that two call sites disagree about what the code means.');
    }

    const apiSrc = walk('api/src', isTs)
        .filter((f) => !f.includes('__tests__'))
        .map(code)
        .join('\n');
    for (const c of codes) {
        if (!apiSrc.includes(`'${c}'`)) {
            fail(CODES, `\`${c}\` is never thrown or emitted`, 'Remove it, or throw it. An unreachable code still costs a translation in every locale and suggests a failure path that does not exist.');
        }
    }

    const known = new Set(codes);
    for (const file of fs.readdirSync(path.join(ROOT, LOCALE_DIR)).filter((f) => f.endsWith('.json'))) {
        const rel = `${LOCALE_DIR}/${file}`;
        const dict = JSON.parse(read(rel)).errors ?? {};
        for (const key of Object.keys(dict)) {
            if (!known.has(key)) {
                fail(rel, `\`errors.${key}\` translates a code that no longer exists`, 'Drop it. An orphaned entry outlives the rename that stranded it and makes the dictionary look like it covers more than it does.');
            }
        }
        for (const c of codes) {
            if (typeof dict[c] !== 'string' || dict[c].trim() === '') {
                fail(rel, `no translation for \`${c}\``, 'A code with no translation reaches the user as raw SCREAMING_SNAKE. Adding a code means adding it to every locale.');
            }
        }
    }

    for (const rel of walk('api/src', isTs)) {
        if (rel.includes('__tests__') || DIRECT_CODE_EMITTERS.includes(rel)) continue;
        const src2 = code(rel);
        for (const m of src2.matchAll(/error:\s*'(VALIDATION_FAILED|RATE_LIMITED)'/g)) {
            const raw = read(rel);
            if (raw.slice(Math.max(0, m.index - 400), m.index).includes('eslint-disable')) continue;
            fail(`${rel}:${lineOf(src2, m.index)}`, `emits \`${m[1]}\` directly`, `Only ${DIRECT_CODE_EMITTERS.join(' and ')} may emit a code without throwing AppError. Everything else throws.`);
        }
    }
}

// ── 5. Credential failures are flagged as security events ───────────────────
for (const t of throws) {
    if (t.errorCode === null || !isSecurityEvent(t.errorCode)) continue;
    if (optionField(t.args, 'securityEvent') !== 'true') {
        fail(`${t.rel}:${t.line}`, `\`${t.errorCode}\` is thrown without securityEvent`, 'Pass `securityEvent: true` in the options object so the handler attaches ip + user-agent to the boundary log. If this code is genuinely routine rather than a credential failure, privilege denial or lockout, add it to NOT_SECURITY_EVENTS in this gate with a note.');
    }
}

for (const c of [...SECURITY_EVENT_CODES, ...NOT_SECURITY_EVENTS]) {
    if (!allCodes.includes(c)) {
        fail(CODES, `\`${c}\` is listed in this gate but no longer exists`, 'Drop it from SECURITY_EVENT_CODES / NOT_SECURITY_EVENTS — a stale entry quietly narrows the check.');
    }
}
for (const c of SECURITY_EVENT_CODES) {
    if (SECURITY_EVENT_PATTERNS.some((p) => p.test(c))) {
        fail(CODES, `\`${c}\` is listed explicitly but a pattern already covers it`, 'Remove the redundant entry — the list is meant to hold only the codes whose names carry no signal.');
    }
}

// ── 6. `params` carry no request input ──────────────────────────────────────
for (const t of throws) {
    const params = optionField(t.args, 'params');
    if (params === null || !params.startsWith('{')) continue;
    const hit = /\breq\.(params|body|query|headers)\b|\bidentifier\b|\bfilename\b/.exec(params);
    if (hit !== null) {
        fail(`${t.rel}:${t.line}`, `\`params\` carries request input (${hit[0]})`, 'params are sent to the client and interpolated into a translation — that is the reflected-XSS vector. Move it into the `message` argument, which is logged and never leaves the server.');
    }
}

// ── 7. The non-HTTP services ────────────────────────────────────────────────
// There is no BullMQ here: the worker is an XREADGROUP consumer and a nightly
// dependency line, and the ingestor is one socket. What they share with a queue
// is that nothing catches for them — there is no middleware out there — so the
// rule that matters is that they do not reach for the HTTP error type.
{
    for (const rel of [...walk('worker/src', isTs), ...walk('ingestor/src', isTs), ...walk('packages/shared/src', isTs)]) {
        if (rel.includes('__tests__')) continue;
        if (/\bAppError\b/.test(code(rel))) {
            fail(
                rel,
                'uses AppError',
                'AppError is an HTTP concept — a status code, an Express handler, a client-facing translation. A failed aggregation or a dropped vendor socket has none of those. Throw a plain Error and let the service’s own boundary log it.',
            );
        }
    }
}

// ── 8. The frontend end of the contract ─────────────────────────────────────
{
    const src = code(CLIENT);
    if (!/errors\.\$\{/.test(src) || !/i18n\.global\.te\(/.test(src)) {
        fail(CLIENT, 'the interceptor does not localise `data.error`', 'Translate the code once, in the interceptor, so every call site that reads `data.error` gets localised text with no per-site change.');
    }
    if (!/i18n\.global\.t\('errors\.INTERNAL'\)/.test(src)) {
        fail(CLIENT, 'no fallback for an unknown code', "A SCREAMING_SNAKE code with no translation must fall back to errors.INTERNAL — a raw code must never reach the user's eyes.");
    }
    for (const rel of walk('frontend/src', (n) => /\.(ts|vue)$/.test(n))) {
        if (rel.includes('__tests__')) continue;
        if (/\bAppError\b/.test(code(rel))) {
            fail(rel, 'references AppError', 'AppError is server-side. The frontend sees codes on the wire, nothing else.');
        }
    }
}

// ── 9. A server-side swallow states its reason ──────────────────────────────
{
    const REASONLESS = /^(ignore|ignored|silently (fail|ignore)|no-?op|noop|skip|cleanup|whatever|nothing|todo)\.?$/i;
    for (const rel of backendFiles) {
        const src = read(rel);
        for (const m of src.matchAll(/\}\s*catch\s*(?:\([^)]*\)\s*)?\{([^{}]*)\}/g)) {
            const body = m[1];
            const statements = stripComments(body).trim();
            if (statements !== '') continue; 
            const reason = body
                .replace(/\/\*|\*\/|^\s*\/\//gm, '')
                .replace(/\s+/g, ' ')
                .trim();
            if (reason === '' || REASONLESS.test(reason)) {
                fail(`${rel}:${lineOf(src, m.index)}`, `swallows without a reason (${reason === '' ? 'no comment' : `"${reason}"`})`, 'Say what is being dropped and why it is safe to drop — "already gone", "cleanup failure is non-fatal". A bare `/* ignore */` is the anti-pattern the standard names, because it reads the same whether the author reasoned about it or not.');
            }
        }
    }
}

function isTs(name) {
    return name.endsWith('.ts');
}

/**
 * Split the arguments of the call whose opening paren is at `open`.
 * Needed because three sections read three different argument POSITIONS of the
 * same `new AppError(...)` call, and position is the whole contract: argument 3
 * is logged, argument 4 is served to the client, argument 6 decides whether the
 * log collects PII. A regex can't split them — arguments 4 and 5 are object
 * literals with commas inside, and the message is often a template string with
 * a comma in the prose.
 */
function callArguments(src, open) {
    let depth = 0;
    let start = open + 1;
    const args = [];
    for (let i = open; i < src.length; i++) {
        const ch = src[i];
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') {
            if (--depth === 0) {
                args.push(src.slice(start, i));
                return args;
            }
        } else if (ch === ',' && depth === 1) {
            args.push(src.slice(start, i));
            start = i + 1;
        } else if (ch === "'" || ch === '"' || ch === '`') {
            i++;
            while (i < src.length && src[i] !== ch) i += src[i] === '\\' ? 2 : 1;
        }
    }
    return null;
}

function optionField(args, name) {
    const options = args[3]?.trim();
    if (options === undefined || !options.startsWith('{')) return null;
    const fields = callArguments(options, 0);
    if (fields === null) return null;
    for (const field of fields) {
        const match = new RegExp(`^\\s*${name}\\s*:([\\s\\S]*)$`).exec(field);
        if (match !== null) return match[1].trim();
    }
    return null;
}

function walk(rel, keep) {
    const out = [];
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) out.push(...walk(child, keep));
        else if (keep(entry.name)) out.push(child);
    }
    return out;
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
    console.error(`\n✖ ${failures.length} error-handling violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See error-handling.instructions.md, then re-run.');
    process.exit(1);
}

const byStatus = new Map();
for (const t of throws) byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
const summary = [...byStatus].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}×${n}`).join(' ');
const thrownCodes = new Set(throws.map((t) => t.errorCode).filter((c) => c !== null));
const secCount = [...thrownCodes].filter(isSecurityEvent).length;
console.log(
    `✓ Error handling OK — ${throws.length} AppError throws across ${thrownCodes.size} codes, all on policy statuses (${summary}) and each code on exactly one of them, one 4-arg handler mounted last with its branches in order, ${secCount} credential-failure codes flagged as security events, no request input in wire params, the HTTP error type confined to the API.`,
);
console.log(
    '\nNot machine-checked: whether a given failure is operational or a programmer error, whether 401 or 403 is the right one for a case, whether a best-effort call should be best-effort at all, whether a code is specific enough for the UI to act on.',
);

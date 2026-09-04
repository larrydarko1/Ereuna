#!/usr/bin/env node
/**
 * REST API architecture gate.
 *   1. ROUTE DOCUMENTATION PARITY. Every router file opens with a JSDoc header
 *      listing its routes, and the standard says to update it whenever a route
 *      is added, removed or renamed. Nothing enforced that, so it rotted: this
 *      gate found 13 routes live in production and absent from their header,
 *      plus one documenting Express 4 syntax the code stopped using. A stale
 *      header is worse than none — it is a map that confidently points the
 *      wrong way, and review trusts it.
 *   2. MIDDLEWARE ORDER. helmet before everything, errorHandler after every
 *      route. Express identifies the error handler by its four-argument
 *      signature, so registering it early doesn't fail — errors simply stop
 *      reaching it and every 4xx degrades to an unhandled 500. Silent.
 *   3. A RATE-LIMIT TIER ON EVERY MOUNT. A router mounted without one is
 *      unlimited, and it looks exactly like the twenty lines above it.
 *   4. THE TOKEN-BUCKET CONTRACT. Atomic Lua EVAL, fails OPEN, sets Retry-After.
 *      Flip the catch to fail closed and a Redis blip locks out the whole
 *      platform — a two-character change no test would notice.
 *   5. ROUTES STAY THIN. No DB handle in a route file: validate → service →
 *      respond.
 *   6. PATH SHAPE. No `/api/v1` prefix, kebab-case, no verb duplicating the
 *      HTTP method.
 *   7. THE CORS/COOKIE PAIR. `credentials: true` on the server and
 *      `withCredentials: true` on the client are one setting in two repos;
 *      either alone silently breaks refresh-token round-tripping.
 *   8. THE PAGINATION CAP. An uncapped `limit` is a client-controlled query
 *      cost — a denial-of-service parameter with a friendly name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const ROUTES_DIR = 'api/src/routes';
const INDEX_TS = 'api/src/index.ts';
const RATE_LIMITERS = 'api/src/lib/rate-limiters.ts';
const TOKEN_BUCKET = 'api/src/lib/token-bucket.ts';
const SCHEMAS = 'api/src/lib/schemas.ts';
const API_CLIENT = 'frontend/src/api/client.ts';

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. Route documentation parity ───────────────────────────────────────────
const routeFiles = walk(ROUTES_DIR, (n) => n.endsWith('.ts'));

for (const rel of routeFiles) {
    const src = read(rel);
    const header = /^\/\*\*[\s\S]*?\*\//.exec(src)?.[0] ?? '';
    const declared = new Set(
        [...stripComments(src).matchAll(/^router\.(get|post|put|patch|delete)\(\s*\n?\s*'([^']*)'/gm)].map(
            ([, verb, p]) => `${verb.toUpperCase()} ${p}`,
        ),
    );

    const mount = /mounted at (\/\S*)/.exec(header)?.[1] ?? null;
    const documented = new Set(
        [...header.matchAll(/^\s*\*\s+(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)/gm)].map(([, verb, p]) => {
            let route = p;
            if (mount !== null && route.startsWith(mount)) route = route.slice(mount.length) || '/';
            return `${verb} ${route}`;
        }),
    );

    if (declared.size === 0 && documented.size === 0) continue; 

    const undocumented = [...declared].filter((r) => !documented.has(r));
    const phantom = [...documented].filter((r) => !declared.has(r));

    if (undocumented.length) {
        fail(
            rel,
            `route(s) not in the file's JSDoc header: ${undocumented.join(', ')}`,
            'The header is the only index of this router. A route missing from it is invisible to anyone reading the file top-down, and to any review of what the API exposes.',
        );
    }
    if (phantom.length) {
        fail(
            rel,
            `header documents route(s) the file does not declare: ${phantom.join(', ')}`,
            'The route was renamed or removed and the header was not. It now points callers at a 404.',
        );
    }
}

// ── 2. Route path shape ─────────────────────────────────────────────────────
const VERB_SEGMENTS = new Set(['create', 'update', 'delete', 'remove', 'get', 'list', 'new', 'edit', 'fetch']);

for (const rel of routeFiles) {
    for (const [, , routePath] of stripComments(read(rel)).matchAll(
        /^router\.(get|post|put|patch|delete)\(\s*\n?\s*'([^']*)'/gm,
    )) {
        for (const segment of routePath.split('/')) {
            if (segment === '' || segment.startsWith(':') || segment.startsWith('*')) continue;
            if (VERB_SEGMENTS.has(segment)) {
                fail(
                    rel,
                    `route path '${routePath}' has the verb segment '${segment}'`,
                    'The HTTP method does the verbing — `POST /videos`, not `POST /videos/create`. A verb in the path means two things claim to say what the request does.',
                );
            }
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(segment)) {
                fail(
                    rel,
                    `route path '${routePath}' has the non-kebab-case segment '${segment}'`,
                    'Resource paths are kebab-case: /email-verifications, not /emailVerifications. URLs are case-sensitive and camelCase in one reads as a typo next to the rest.',
                );
            }
        }
    }
}

const indexTs = read(INDEX_TS);
if (/['"]\/api\/v\d/.test(indexTs)) {
    fail(
        INDEX_TS,
        'mounts a versioned `/api/v<n>` prefix',
        'Routes stay flat under /api/ until a real v2 exists. Premature versioning puts a number in every path that nothing ever increments.',
    );
}

// ── 3. Routes stay thin ─────────────────────────────────────────────────────
for (const rel of routeFiles) {
    const src = stripComments(read(rel));
    if (/\bgetDb\(\)/.test(src) || /\bdb\.collection\(/.test(src)) {
        fail(
            rel,
            'reaches the database directly',
            'Routes are thin wrappers: validate → call service → respond. A query in a route is untestable without HTTP and invisible to anyone auditing data access by service.',
        );
    }
}

// ── 4. Middleware order in index.ts ─────────────────────────────────────────
const at = (needle) => indexTs.indexOf(needle);

const helmetAt = at('app.use(\n    helmet(');
const corsAt = at('cors({');
const jsonAt = at('express.json(');
const errorHandlerAt = at('app.use(errorHandler)');
const firstRouteAt = indexTs.search(/app\.(use|get)\(\s*['"]\//);

for (const [what, pos] of [
    ['helmet()', helmetAt],
    ['cors()', corsAt],
    ['express.json()', jsonAt],
    ['errorHandler', errorHandlerAt],
]) {
    if (pos === -1) {
        fail(
            INDEX_TS,
            `no longer registers ${what}`,
            'The middleware stack is load-bearing: helmet sets every security header, cors gates the origin, json parses bodies, errorHandler is the single response boundary.',
        );
    }
}

if (helmetAt !== -1 && firstRouteAt !== -1 && helmetAt > firstRouteAt) {
    fail(
        INDEX_TS,
        'registers helmet() after the first route',
        'Headers set after a route has already responded are set on nothing. helmet must be the first middleware.',
    );
}
if (corsAt !== -1 && jsonAt !== -1 && corsAt > jsonAt) {
    fail(
        INDEX_TS,
        'registers cors() after express.json()',
        'Body parsing must not run before the origin check — a rejected origin should never have had its payload read.',
    );
}
if (errorHandlerAt !== -1 && errorHandlerAt < indexTs.lastIndexOf("app.use('/api/")) {
    fail(
        INDEX_TS,
        'registers errorHandler before the last route',
        'Express identifies the error handler by its 4-argument signature and only reaches it via routes registered BEFORE it. Registered early it never fires — and nothing fails loudly; every AppError degrades to an unhandled 500.',
    );
}

// ── 5. Every mounted router carries a rate-limit tier ───────────────────────
const TIERS = ['strictLimiter', 'standardLimiter', 'relaxedLimiter', 'assetLimiter'];
for (const [, mountPath, args] of indexTs.matchAll(/app\.use\(\s*('\/api\/[^']*')\s*,\s*([^)]*)\)/g)) {
    if (!TIERS.some((t) => args.includes(t))) {
        fail(
            INDEX_TS,
            `mounts ${mountPath} with no rate-limit tier`,
            'A router mounted without a limiter is unlimited and looks identical to the ten limited ones around it. Every /api/* mount takes one of the tiers in rate-limiters.ts.',
        );
    }
}

// ── 6. The token-bucket contract ────────────────────────────────────────────
const bucket = read(TOKEN_BUCKET);
const limiters = read(RATE_LIMITERS);

if (!/\.eval\(/.test(bucket)) {
    fail(
        TOKEN_BUCKET,
        'no Redis `eval()` — the refill-and-consume is no longer one atomic script',
        'Read-modify-write across API replicas must be atomic or two pods refill the same bucket concurrently and the limit is not a limit. A single Lua EVAL is what makes it atomic without a distributed lock.',
    );
}
if (!/allowed:\s*true/.test(bucket) || !/catch/.test(bucket)) {
    fail(
        TOKEN_BUCKET,
        'no longer fails OPEN on a Redis error',
        'A cache blip must not lock every client out of the platform. On a Redis failure the bucket allows the request and logs a warning — never denies. Failing closed turns a dependency outage into a total outage.',
    );
}
if (!/Retry-After/.test(limiters)) {
    fail(
        RATE_LIMITERS,
        'does not set `Retry-After` on a 429',
        'Without it a throttled client has no idea how long to wait and retries immediately — the limiter then generates the load it exists to shed.',
    );
}
if (!/'RateLimit-Remaining'/.test(limiters)) {
    fail(RATE_LIMITERS, 'does not set `RateLimit-Remaining`', 'Clients cannot back off before hitting the wall if the budget is invisible.');
}
for (const rel of [RATE_LIMITERS, TOKEN_BUCKET]) {
    if (/X-RateLimit-/i.test(read(rel))) {
        fail(rel, 'uses an `X-RateLimit-*` header', 'The IETF standard names carry no `X-` prefix (RFC 6648 deprecated it). Use `RateLimit-Remaining` / `Retry-After`.');
    }
}

// ── 7. Pagination cap ───────────────────────────────────────────────────────
const schemas = read(SCHEMAS);
if (!/makePaginationQuery/.test(schemas)) {
    fail(SCHEMAS, 'no `makePaginationQuery` factory', 'It is the single definition of the pagination contract — page ≥ 1, limit capped. Per-route hand-rolled schemas drift apart.');
} else {
    if (!/\.max\(maxLimit/.test(schemas)) {
        fail(
            SCHEMAS,
            'the pagination `limit` is not capped by `maxLimit`',
            'An uncapped limit is a client-controlled query cost: `?limit=1000000` is a denial-of-service parameter with a friendly name.',
        );
    }
    if (!/\.min\(1/.test(schemas)) {
        fail(SCHEMAS, 'the pagination `page` has no `min(1)`', 'A page of 0 or negative produces a negative `skip`, which Mongo rejects at query time as a 500 instead of a 422.');
    }
}

// ── 8. CORS + credentials, both halves ──────────────────────────────────────
if (!/origin:\s*config\.corsOrigin/.test(indexTs)) {
    fail(
        INDEX_TS,
        'cors() origin is not `config.corsOrigin`',
        'The single allowed origin comes from the Zod-validated env schema. A literal or a wildcard here bypasses that validation and, with credentials:true, is a cross-origin credential leak.',
    );
}
if (!/credentials:\s*true/.test(indexTs)) {
    fail(INDEX_TS, 'cors() is missing `credentials: true`', 'Without it the browser drops the httpOnly refresh cookie and every session silently ends at access-token expiry.');
}
if (!/withCredentials:\s*true/.test(read(API_CLIENT))) {
    fail(
        API_CLIENT,
        'the axios client is missing `withCredentials: true`',
        'The client half of the same setting. `credentials: true` on the server alone does nothing — the browser still withholds the cookie unless the request asks for it.',
    );
}

function stripComments(src) {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        const next = src[i + 1];
        if (c === '/' && next === '*') {
            const end = src.indexOf('*/', i + 2);
            i = end === -1 ? src.length : end + 2;
        } else if (c === '/' && next === '/') {
            const end = src.indexOf('\n', i);
            i = end === -1 ? src.length : end;
        } else if (c === "'" || c === '"' || c === '`') {
            const start = i++;
            while (i < src.length && src[i] !== c) i += src[i] === '\\' ? 2 : 1;
            out += src.slice(start, ++i);
        } else {
            out += c;
            i++;
        }
    }
    return out;
}

function walk(dir, test, out = []) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return out;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(rel, test, out);
        else if (test(entry.name)) out.push(rel);
    }
    return out;
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
    console.error(`\n✖ ${failures.length} REST API standard violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See api.instructions.md, then re-run.');
    process.exit(1);
}

const routeCount = routeFiles.reduce(
    (n, rel) => n + [...stripComments(read(rel)).matchAll(/^router\.(get|post|put|patch|delete)\(/gm)].length,
    0,
);
console.log(
    `✓ REST API architecture OK — ${routeCount} routes across ${routeFiles.length} files, all documented in their router header, middleware ordered, every mount rate-limited, token bucket atomic and fail-open.`,
);
console.log(
    '\nNot machine-checked: whether a status code is the RIGHT one, whether independent awaits were parallelised, cache TTL judgement, idempotency of a given POST.',
);

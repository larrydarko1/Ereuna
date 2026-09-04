#!/usr/bin/env node
/**
 * WebSocket / real-time architecture gate (websockets.instructions.md).
 *   1. ONE SERVER, ON THE EXISTING LISTENER. A second `new Server()` — or a
 *      second `io()` on the client — is a second connection with its own auth
 *      token and its own reconnect loop, on a second port.
 *   2. NO REDIS ADAPTER, AND THE REASON IN WRITING. This is the one rule that
 *      is inverted from the standard, so it is the one most likely to be
 *      "fixed" by someone who knows the standard and not this gateway. The
 *      adapter exists to route an emit raised on one pod to a socket held by
 *      another; here every pod holds its own `psubscribe aggr:*` and therefore
 *      already has every bucket its own sockets need, so the adapter would
 *      republish each message across the cluster to be discarded. Adding it is
 *      a regression, and the argument has to stay in the header where the next
 *      person looks.
 *   3. THE ORIGIN CHECK ON THE UPGRADE. CORS does not govern a WebSocket
 *      upgrade. `cors` covers the polling transport and nothing else, so the
 *      upgrade is checked in `allowRequest` — and a gateway with only the
 *      `cors` option looks completely protected.
 *   4. HANDSHAKE AUTH. The same secret and the same pinned algorithm as REST,
 *      read from `handshake.auth` and never the query string, which is written
 *      verbatim into every proxy log.
 *   5. MIDDLEWARE ORDER. The connection rate limit runs as the FIRST `io.use()`,
 *      ahead of JWT verification — that is the entire point of limiting at
 *      connection time. Swapping the two still "works" while making every
 *      handshake flood pay for a signature verification first. Order is a
 *      position in a file; no type checks it.
 *   6. THE PROXY HOP COUNT. Socket.IO does NOT honour Express `trust proxy`, so
 *      the gateway parses X-Forwarded-For itself. Get it wrong and every
 *      connection keys off the proxy's address: one shared bucket, so the first
 *      flood locks out every real user. It reads as working code.
 *   7. EMITS COME FROM THE GATEWAY, INTO NAMED ROOMS. A service that reaches
 *      for an `io` handle of its own is one that can await an emit, or fail a
 *      request because a socket push failed. Room names are built by a helper
 *      so the join site and the emit site cannot spell them differently.
 *   8. THE EVENT CONTRACT IN THE HEADER. The socket's equivalent of a router's
 *      JSDoc route map, and it rots the same way — in both directions, since
 *      this socket takes inbound events as well as pushing.
 *   9. INBOUND PAYLOADS ARE ZOD-VALIDATED AND RATE LIMITED. An authenticated
 *      socket is still untrusted input, and a subscription change is
 *      client-controlled work — the per-IP handshake limit does not bound it.
 *  10. THE FRONTEND HALF. One client module; the token re-read on every attempt
 *      rather than captured once; the connection dropped when the session is;
 *      and every listener a composable registers removed in `onUnmounted`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const GATEWAY_DIR = 'api/src/gateway';
const GATEWAY = 'api/src/gateway/socket.ts';
const CLIENT = 'frontend/src/api/socket.ts';

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const gw = read(GATEWAY);
const header = /^\/\*\*[\s\S]*?\*\//.exec(gw)?.[0] ?? '';
const gwBody = gw.slice(header.length);

// ── 1. One Socket.IO server, on the existing HTTP listener ──────────────────
{
    const importers = walk('api/src', (n) => n.endsWith('.ts')).filter(
        (rel) => !rel.startsWith(GATEWAY_DIR) && !rel.includes('__tests__') && /from 'socket\.io'/.test(read(rel)),
    );
    for (const rel of importers) {
        fail(rel, 'imports `socket.io` outside the gateway', 'One Socket.IO server, owned by api/src/gateway. Import the gateway’s helpers instead.');
    }

    const servers = [...gwBody.matchAll(/new Server\(\s*(\w+)/g)];
    if (servers.length !== 1) {
        fail(GATEWAY, `constructs ${servers.length} Socket.IO server(s)`, 'Exactly one `new Server(httpServer, …)` — a second server is a second listener on a second port.');
    } else if (!/httpServer|server/i.test(servers[0][1])) {
        fail(GATEWAY, `new Server() is not passed the HTTP server (got \`${servers[0][1]}\`)`, 'Attach to the existing Express HTTP server, never a port of its own.');
    }
}

// ── 2. No Redis adapter, and the reason in writing ──────────────────────────
{
    if (/@socket\.io\/redis-adapter|io\.adapter\(/.test(gwBody)) {
        fail(
            GATEWAY,
            'installs a Socket.IO Redis adapter',
            'Deliberately absent here. Every pod already runs its own `psubscribe aggr:*`, so it holds every bucket its own sockets need; the adapter would republish each message across the cluster for every other pod to discard. If the fan-out model ever changes, change the header first.',
        );
    }
    if (!/no Redis adapter/i.test(header)) {
        fail(
            GATEWAY,
            'the header no longer explains why there is no Redis adapter',
            'This gateway departs from the standard on purpose. The argument has to live where the next person looks, or it gets "fixed" back.',
        );
    }
}

// ── 3. The origin check on the upgrade ──────────────────────────────────────
{
    if (!/allowRequest:/.test(gwBody)) {
        fail(
            GATEWAY,
            'no `allowRequest` origin check',
            'CORS does not govern a WebSocket upgrade. The `cors` option covers the polling transport only — without allowRequest any origin can open a socket.',
        );
    } else if (!/allowRequest:[\s\S]{0,400}?config\.corsOrigin/.test(gwBody)) {
        fail(GATEWAY, '`allowRequest` does not compare against config.corsOrigin', 'The same single allowed origin as REST, from the same Zod-validated env value.');
    }
    if (!/cors:\s*\{\s*origin:\s*config\.corsOrigin/.test(gwBody)) {
        fail(GATEWAY, 'the `cors` option is not config.corsOrigin', 'The polling transport half of the same setting.');
    }
}

// ── 4. Handshake auth: same secret, pinned algorithm, in an io.use() ────────
{
    const verifyAt = gwBody.indexOf('jwt.verify');
    if (verifyAt === -1) {
        fail(GATEWAY, 'no jwt.verify() on the handshake', 'Verify the access token in an io.use() middleware and stash the user id on the socket.');
    } else {
        if (!useSpans().some(([from, to]) => verifyAt > from && verifyAt < to)) {
            fail(GATEWAY, 'jwt.verify() is not inside an io.use() middleware', 'Authentication belongs in io.use() so an unauthenticated socket never reaches a handler.');
        }
        if (!/jwt\.verify\([\s\S]{0,200}?config\.jwt\.secret/.test(gwBody)) {
            fail(GATEWAY, 'the handshake does not verify with config.jwt.secret', 'Same secret as the REST API — a socket is not a separate trust domain.');
        }
        if (!/jwt\.verify\([\s\S]{0,200}?algorithms:\s*\['HS256'\]/.test(gwBody)) {
            fail(GATEWAY, 'jwt.verify() does not pin `algorithms`', "Pin `{ algorithms: ['HS256'] }` — an unpinned verify accepts a token whose algorithm the attacker chose.");
        }
        if (!/handshake\.auth/.test(gwBody)) {
            fail(GATEWAY, 'the handshake token is not read from `handshake.auth`', 'Never the query string — it is written verbatim into proxy and access logs.');
        }
    }
}

// ── 5. The rate limit is the FIRST io.use() ─────────────────────────────────
{
    const uses = [...gwBody.matchAll(/io\.use\(/g)].map((m) => m.index);
    const rl = gwBody.indexOf('rl:ws:conn:');
    const jwtAt = gwBody.indexOf('jwt.verify');
    if (uses.length < 2) {
        fail(GATEWAY, `only ${uses.length} io.use() middleware(s)`, 'Expected two: the connection rate limit, then JWT verification.');
    } else if (rl === -1) {
        fail(GATEWAY, 'no connection-time rate limit', 'Run one as the first io.use() — it sheds handshake floods before any auth or database work.');
    } else if (!(uses[0] < rl && rl < jwtAt)) {
        fail(GATEWAY, 'the rate limit does not run before JWT verification', 'It must be the FIRST io.use(); behind auth, every flood attempt pays for a signature verification first.');
    }

    if (!/consumeTokenBucket\(/.test(gwBody)) {
        fail(GATEWAY, 'the connection limit does not use consumeTokenBucket', 'Reuse the REST limiter — Redis-backed, shared across pods, fails open. A local counter limits one pod.');
    }
    if (!/rl:ws:conn:\$\{/.test(gwBody)) {
        fail(GATEWAY, 'the connection bucket is not keyed per client', 'Key on the resolved client IP (`rl:ws:conn:${ip}`), or every connection shares one bucket.');
    }
    if (!/capacity:\s*\d+[\s\S]{0,40}refillPerMs:/.test(gwBody)) {
        fail(GATEWAY, 'no token-bucket options for the connection limit', 'Declare `{ capacity, refillPerMs }` so the burst and the sustained rate are both visible.');
    }
}

// ── 6. Client IP mirrors the Express hop count ──────────────────────────────
{
    if (!/headers\[['"]x-forwarded-for['"]\]/i.test(gwBody)) {
        fail(GATEWAY, 'X-Forwarded-For is not parsed', 'Socket.IO does not honour Express `trust proxy`; without this every rate limit keys off the proxy address and collapses to one shared bucket.');
    } else {
        if (!/config\.trustProxyHops/.test(gwBody)) {
            fail(GATEWAY, 'the hop count is not config.trustProxyHops', 'Mirror the Express setting from the same config value — two hop counts that can disagree will.');
        }
        if (!/parts\.length\s*-\s*config\.trustProxyHops/.test(gwBody)) {
            fail(GATEWAY, 'the trusted hop is not counted from the end of X-Forwarded-For', 'Proxies append, so trusted entries are rightmost. Counting from the left takes a value the client controls.');
        }
    }
}

// ── 7. Emits come from the gateway, into named rooms ────────────────────────
{
    const emitters = walk('api/src', (n) => n.endsWith('.ts')).filter(
        (rel) => !rel.startsWith(GATEWAY_DIR) && !rel.includes('__tests__') && /\.emit\(/.test(read(rel)),
    );
    for (const rel of emitters) {
        fail(rel, 'emits on a socket directly', 'Nothing outside api/src/gateway holds an `io` handle. A service that can emit is a service that can await one, and then a socket failure fails a request.');
    }

    for (const [, room] of gwBody.matchAll(/\.to\(([^)]*)\)/g)) {
        if (/^['"`]/.test(room.trim())) {
            fail(
                GATEWAY,
                `emits to the literal room ${room.trim()}`,
                'Room names are built by a helper (candleRoom/quoteRoom) so the join site and the emit site cannot spell them differently — a mismatch is a silent feed, not an error.',
            );
        }
    }
}

// ── 8. The event contract in the header matches the wire ────────────────────
{
    const LIFECYCLE = new Set(['connect', 'connection', 'disconnect', 'disconnecting', 'connect_error', 'error']);
    const outbound = new Set([...gwBody.matchAll(/\.emit\(\s*'([^']+)'/g)].map((m) => m[1]));
    const inbound = new Set([...gwBody.matchAll(/socket\.on\(\s*'([^']+)'/g)].map((m) => m[1]).filter((e) => !LIFECYCLE.has(e)));
    const onTheWire = new Set([...outbound, ...inbound]);
    const documented = new Set([...header.matchAll(/^\s*\*\s{5}([a-z][a-z0-9-]*:[a-z][a-z0-9-]*)\b/gm)].map((m) => m[1]));

    for (const event of onTheWire) {
        if (!documented.has(event)) {
            fail(GATEWAY, `\`${event}\` is on the wire but not in the header contract`, 'The header is this file’s route map. Add the event and its payload shape under the direction it travels.');
        }
    }
    for (const event of documented) {
        if (!onTheWire.has(event)) {
            fail(GATEWAY, `the header documents \`${event}\`, which nothing sends or handles`, 'Remove it, or implement it. A contract listing an event that does not exist is worse than no contract.');
        }
    }
    if (!/^\s*\*\s+Server\s*→\s*Client:\s*$/m.test(header)) {
        fail(GATEWAY, 'the header has no Server → Client event list', 'Document the event contract — direction and payload shape per event.');
    }
    if (!/^\s*\*\s+Client\s*→\s*Server:\s*$/m.test(header)) {
        fail(GATEWAY, 'the header does not state the Client → Server direction', 'Say it explicitly, even when empty (`(none — push-only)`) — that is what would justify having no per-message rate limit.');
    }
}

// ── 9. Inbound events are validated and rate limited ────────────────────────
{
    const LIFECYCLE = new Set(['connect', 'connection', 'disconnect', 'disconnecting', 'connect_error', 'error']);
    const inbound = [...gwBody.matchAll(/socket\.on\(\s*'([^']+)'/g)].map((m) => m[1]).filter((e) => !LIFECYCLE.has(e));
    for (const event of inbound) {
        // The listener delegates to a named handler, so the whole module is
        // searched for a parse of the schema named after the event:
        // `candle:watch` → `candleWatchSchema`.
        const schema = event.replace(/:(.)/g, (_, c) => c.toUpperCase());
        if (!new RegExp(`${schema}\\w*[Ss]chema\\.(safeParse|parse)\\(`).test(gwBody)) {
            fail(GATEWAY, `inbound event \`${event}\` has no matching Zod parse`, 'Validate the payload like a request body. An authenticated socket is still untrusted input.');
        }
    }
    if (inbound.length > 0 && !/rl:ws:(?!conn)/.test(gwBody)) {
        fail(
            GATEWAY,
            'inbound events exist with no per-message rate limit',
            'Connection-time limiting alone is only sufficient for a push-only socket. A subscription change is client-controlled work and needs its own bucket.',
        );
    }
}

// ── 10. The frontend half ───────────────────────────────────────────────────
{
    if (!exists(CLIENT)) {
        fail(CLIENT, 'missing', 'One socket client module for the whole frontend.');
    } else {
        const client = read(CLIENT);
        if (!/auth:\s*\(/.test(client)) {
            fail(CLIENT, 'the handshake token is captured, not re-read per attempt', 'Pass `auth` as a callback — socket.io-client re-invokes it before every reconnect, so a reconnect after a silent refresh carries the new token rather than the expired one.');
        }
        if (!/findAccessToken\(\)/.test(client)) {
            fail(CLIENT, 'no access token on the handshake', 'Connect with the access token in `auth.token`.');
        }
        if (!/autoConnect:\s*false/.test(client)) {
            fail(CLIENT, 'the socket connects before authentication', 'Set `autoConnect: false` and connect once authenticated — an anonymous handshake just burns a connection-bucket token.');
        }
        // Deliberately not `export function`: what the standard asks for is that
        // the teardown exists and is REGISTERED, which the next rule checks.
        // Exporting it as well is worse, not better — it hands any caller the
        // ability to drop a socket the rest of the app is still reading from,
        // and the dead-code gate correctly reports it as an export nobody
        // imports. `onSessionCleared` is the only caller there should ever be.
        if (!/function disconnectSocket/.test(client)) {
            fail(CLIENT, 'no disconnectSocket()', 'Define one so the session teardown can drop the connection and discard the singleton.');
        } else if (!/onSessionCleared\(disconnectSocket\)/.test(client)) {
            fail(
                CLIENT,
                'disconnectSocket() is not wired to the session teardown',
                'Register it with `onSessionCleared` — a socket authenticated as the previous user must not survive a sign-out, and leaving that to each caller means one of them forgets.',
            );
        }

        const clients = walk('frontend/src', (n) => /\.(ts|vue)$/.test(n)).filter(
            (rel) => rel !== CLIENT && !rel.includes('__tests__') && /\bio\(/.test(read(rel)) && /socket\.io-client/.test(read(rel)),
        );
        for (const rel of clients) {
            fail(rel, 'opens a second socket.io-client connection', 'One connection per tab, from api/socket.ts. A second is a second handshake and a second reconnect loop under the same token.');
        }
    }

    for (const rel of walk('frontend/src', (n) => /\.(ts|vue)$/.test(n))) {
        if (rel === CLIENT || rel.includes('__tests__')) continue;
        const src = read(rel);
        const listeners = [...src.matchAll(/socket\.on\(\s*'([^']+)'/g)].map((m) => m[1]);
        if (listeners.length === 0) continue;
        // Either teardown hook: `onScopeDispose` is the right one in a
        // composable — it fires for a manual effectScope too, where
        // `onUnmounted` never runs because there is no component instance.
        const disposeAt = Math.min(...[src.indexOf('onScopeDispose('), src.indexOf('onUnmounted(')].filter((i) => i !== -1));
        if (!Number.isFinite(disposeAt)) {
            fail(rel, 'registers a socket listener with no teardown hook', 'A listener left behind keeps firing into dead state, and re-registers on every remount. Clean up in `onScopeDispose` (or `onUnmounted` in a component).');
            continue;
        }
        const unmount = src.slice(disposeAt);
        for (const event of listeners) {
            if (!new RegExp(`\\.off\\(\\s*'${event}'`).test(unmount)) {
                fail(rel, `listens for \`${event}\` but never removes it in onUnmounted`, 'Remove every listener the composable added — socket.off(event, handler).');
            }
        }
    }
}

/**
 * Byte spans of every `io.use(…)` call in the gateway, by paren matching.
 * Regex cannot do this: a middleware body is arbitrarily nested, and anchoring
 * on a closing `\n    });` encodes today's indentation as the contract.
 */
function useSpans() {
    const spans = [];
    for (const m of gwBody.matchAll(/io\.use\(/g)) {
        let depth = 0;
        for (let i = m.index + m[0].length - 1; i < gwBody.length; i++) {
            if (gwBody[i] === '(') depth++;
            else if (gwBody[i] === ')' && --depth === 0) {
                spans.push([m.index, i]);
                break;
            }
        }
    }
    return spans;
}

function walk(rel, keep, out = []) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (child.startsWith('frontend/src/lib/lightweight-charts')) continue;
        if (entry.isDirectory()) walk(child, keep, out);
        else if (keep(entry.name)) out.push(child);
    }
    return out;
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} WebSocket standard violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See websockets.instructions.md, then re-run.');
    process.exit(1);
}

console.log(
    '✓ WebSocket architecture OK — one server on the API’s listener, no Redis adapter and the reason still written down, origin checked on the upgrade, handshake auth pinned, rate limit ahead of it, hop count mirrored, emits confined to the gateway, event contract matching the wire in both directions, inbound validated and limited, one client with listeners cleaned up.',
);
console.log(
    '\nNot machine-checked: whether a room is the right granularity, whether a payload is minimal, whether a reconnect resubscribes to everything it was watching.',
);

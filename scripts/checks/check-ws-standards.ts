#!/usr/bin/env node
/**
 * WebSocket / real-time architecture gate. The rules — one server on the existing
 * listener, the origin checked on the upgrade, handshake auth pinned, the rate limit
 * ahead of it, the proxy hop count mirrored, emits confined to the gateway, the event
 * contract in the header, inbound payloads validated and limited, and the frontend's
 * one client — live in @larrydarko/lint-config/gates/ws-standards.
 *
 * What stays here is this repo's answers.
 *
 * `redisAdapter: forbidden` is the one rule inverted from the standard, so it is the
 * one most likely to be "fixed" by someone who knows the standard and not this
 * gateway. The adapter exists to route an emit raised on one pod to a socket held by
 * another; here every pod runs its own `psubscribe aggr:*` and so already holds every
 * bucket its own sockets need. The argument has to stay in the gateway header, where
 * the next person looks, and the gate fails if it goes.
 *
 * `rooms: helpers` — sockets join quote and candle rooms for what they are watching,
 * not a personal room, and the room names come from helpers so the join site and the
 * emit site cannot spell them differently.
 *
 * `authModule` points the auth rules at `verifyAccessToken` in the REST middleware,
 * because the handshake calls that rather than `jwt.verify`. It used to verify inline,
 * and an inline verify accepted the 2FA challenge token, which is signed with the
 * same secret: a password alone held a live market feed. The shared function refuses
 * any token carrying a `type`, so REST and the socket now agree on what a session is,
 * and the gate checks the secret and the pinned algorithm in that function's body.
 *
 * `sessionTeardown` — the client registers `disconnectSocket` with
 * `onSessionCleared`, so the connection dies with the session rather than outliving
 * the sign-out.
 *
 * `events` is the shared table of what the gateway pushes, each event with the
 * schema its payload is held to (packages/shared/src/events.ts). The gateway pushes
 * only through `checkedPayload()`, which parses with it, and the frontend's socket is
 * typed from it. The same file carries `CLIENT_EVENTS`, the two inbound watches,
 * which the gateway parses with and the client's emits are typed by; the gate reads
 * only the outbound table.
 */
import { checkWsStandards } from '@larrydarko/lint-config/gates/ws-standards';

checkWsStandards({
    gateway: 'api/src/gateway/socket.ts',
    gatewayDir: 'api/src/gateway',
    serverDirs: 'api/src',
    client: 'frontend/src/api/socket.ts',
    clientDirs: 'frontend/src',
    redisAdapter: {
        mode: 'forbidden',
        headerPhrase: 'no Redis adapter',
        why: 'Every pod already runs its own `psubscribe aggr:*`, so it holds every bucket its own sockets need; the adapter would republish each message across the cluster for every other pod to discard. If the fan-out model ever changes, change the header first.',
    },
    authModule: { file: 'api/src/middleware/auth.ts', fn: 'verifyAccessToken' },
    rooms: { join: 'helpers' },
    sessionTeardown: 'onSessionCleared',
    events: { file: 'packages/shared/src/events.ts', table: 'SERVER_EVENTS' },
});

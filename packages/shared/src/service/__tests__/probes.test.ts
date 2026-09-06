import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { register } from 'prom-client';
import { startProbeServer } from '#service/probes.js';

/**
 * The server binds a real port. Port 0 lets the OS pick a free one, so suites
 * running in parallel never collide, and the address is read back after listen.
 */
let server: Server | null = null;

// `collectDefaultMetrics` registers into a process-global registry and throws
// on a name it has already seen. One process starts one probe server, so that
// is not a bug — but a suite starts a dozen.
beforeEach(() => {
    register.clear();
});

function start(options: { token?: string; onError?: (err: Error) => void } = {}): Promise<string> {
    server = startProbeServer({ port: 0, ...options });
    return new Promise((resolve) => {
        server?.once('listening', () => {
            const { port } = server?.address() as AddressInfo;
            resolve(`http://127.0.0.1:${port}`);
        });
    });
}

afterEach(async () => {
    await new Promise<void>((resolve) => {
        if (server === null) return resolve();
        server.close(() => resolve());
        server = null;
    });
});

describe('/livez', () => {
    it('answers 200 — the reply itself is the signal, since it shares the work loop', async () => {
        const base = await start();
        const res = await fetch(`${base}/livez`);
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true });
    });

    it('ignores a query string, so `/livez?probe=1` still matches', async () => {
        const base = await start();
        expect((await fetch(`${base}/livez?probe=1`)).status).toBe(200);
    });

    it('is GET-only', async () => {
        const base = await start();
        const res = await fetch(`${base}/livez`, { method: 'POST' });
        expect(res.status).toBe(405);
    });
});

describe('/metrics', () => {
    it('renders the prom-client register when no token is configured', async () => {
        const base = await start();
        const res = await fetch(`${base}/metrics`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/plain');
        expect(await res.text()).toContain('process_cpu_user_seconds_total');
    });

    it('serves the register to a caller carrying the configured token', async () => {
        const base = await start({ token: 'secret' });
        const res = await fetch(`${base}/metrics`, { headers: { authorization: 'Bearer secret' } });
        expect(res.status).toBe(200);
    });

    it.each([
        ['no header', {}],
        ['the wrong token', { authorization: 'Bearer wrong' }],
        ['no Bearer prefix', { authorization: 'secret' }],
    ])(
        'answers 404 to %s — an unauthorised caller learns nothing about what is served here',
        async (_label, headers) => {
            const base = await start({ token: 'secret' });
            const res = await fetch(`${base}/metrics`, { headers });
            expect(res.status).toBe(404);
            await expect(res.json()).resolves.toEqual({ error: 'NOT_FOUND' });
        },
    );

    it('treats an empty token as no token at all', async () => {
        const base = await start({ token: '' });
        expect((await fetch(`${base}/metrics`)).status).toBe(200);
    });
});

describe('anything else', () => {
    it.each(['/', '/healthz', '/metrics/extra'])('answers 404 to %s', async (path) => {
        const base = await start();
        const res = await fetch(`${base}${path}`);
        expect(res.status).toBe(404);
    });
});

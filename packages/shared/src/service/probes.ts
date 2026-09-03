/**
 * The probe listener every headless Ereuna process runs.
 * A background service has no inbound traffic of its own, which is exactly why
 * it needs this: `/livez` answering at all is the signal, because the listener
 * shares an event loop with the work, so a reply proves this process is still
 * turning it. An external command probe cannot prove that — it spawns a fresh
 * process that would answer from a wedged one just as happily.
 * `/metrics` renders the default prom-client register. It is gated on a bearer
 * token when one is configured, because process metrics name internals that a
 * public endpoint has no business publishing.
 * Not in the package barrel: this imports `node:http`, and the barrel is
 * consumed by the browser build.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { collectDefaultMetrics, register } from 'prom-client';

export type ProbeOptions = {
    port: number;
    token?: string | undefined;
    onError?: ((err: Error) => void) | undefined;
};

export function startProbeServer({ port, token, onError }: ProbeOptions): Server {
    collectDefaultMetrics();

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        // Query strings are stripped: neither endpoint takes a parameter, and
        // matching on the raw URL would miss `/livez?probe=1`.
        const path = (req.url ?? '').split('?')[0];

        if (req.method !== 'GET') return send(res, 405, { ok: false });
        if (path === '/livez') return send(res, 200, { ok: true });
        if (path !== '/metrics') return send(res, 404, { error: 'NOT_FOUND' });

        // 404 rather than 401: an unauthenticated caller learns nothing about
        // whether metrics are served here at all.
        if (token !== undefined && token !== '' && req.headers.authorization !== `Bearer ${token}`) {
            return send(res, 404, { error: 'NOT_FOUND' });
        }

        register
            .metrics()
            .then((body) => {
                res.writeHead(200, { 'Content-Type': register.contentType });
                res.end(body);
            })
            .catch((err: Error) => {
                onError?.(err);
                send(res, 500, { ok: false });
            });
    });

    server.listen(port);
    return server;
}

function send(res: ServerResponse, status: number, body: Record<string, unknown>): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

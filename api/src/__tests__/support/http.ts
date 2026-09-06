/**
 * A real Express app on an ephemeral port, driven with `fetch`.
 * Middleware and routers are tested through the framework rather than by
 * calling them with hand-built `req`/`res` objects: half of what they do —
 * header casing, Express 5's read-only `req.query`, the four-argument error
 * handler, body parsing — is the framework's behaviour, and a fake `req` agrees
 * with a broken middleware as readily as with a working one.
 */
import express, { type Express, type RequestHandler } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { errorHandler } from '@/middleware/error-handler.js';

export type Harness = {
    app: Express;
    /** Request a path on the running app. Returns the status, the parsed body and the headers. */
    call: (
        path: string,
        init?: RequestInit,
    ) => Promise<{ status: number; body: unknown; headers: Headers; text: string }>;
    close: () => Promise<void>;
};

/**
 * Build and start an app. `mount` gets the app before the error handler is
 * registered, which is the order index.ts uses and the only order in which
 * Express finds the handler at all.
 */
export async function serve(mount: (app: Express) => void, options: { parseJson?: boolean } = {}): Promise<Harness> {
    const app = express();
    app.set('trust proxy', 1);
    // The same 1mb ceiling index.ts sets: the import route accepts 5,000 trades,
    // which is comfortably past the parser's 100kb default.
    if (options.parseJson !== false) app.use(express.json({ limit: '1mb' }));

    mount(app);
    app.use(errorHandler);

    const server: Server = await new Promise((resolve) => {
        const started = app.listen(0, () => resolve(started));
    });

    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;

    return {
        app,
        call: async (path, init) => {
            const response = await fetch(`${base}${path}`, init);
            const text = await response.text();
            let body: unknown = text;
            try {
                body = JSON.parse(text);
            } catch {
                // A non-JSON body is legitimate for the file routes; keep the text
            }
            return { status: response.status, body, headers: response.headers, text };
        },
        close: () =>
            new Promise<void>((resolve) => {
                server.close(() => resolve());
            }),
    };
}

/** A stand-in for the request-scoped logger `requestId` normally binds. */
export const quietLogger: RequestHandler = (req, _res, next) => {
    const noop = (): void => {};
    req.log = { info: noop, warn: noop, error: noop, debug: noop, child: () => req.log } as unknown as typeof req.log;
    next();
};

/** Pretend the request carried a valid access token for `userId`. */
export const asUser =
    (userId: string): RequestHandler =>
    (req, _res, next) => {
        (req as { userId?: string }).userId = userId;
        next();
    };

/** JSON request init, so a test reads as one line rather than four. */
export function json(body: unknown, method = 'POST'): RequestInit {
    return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

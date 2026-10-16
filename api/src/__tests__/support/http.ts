/**
 * A real Express app on an ephemeral port, driven with `fetch`.
 * Middleware and routers are tested through the framework rather than by
 * calling them with hand-built `req`/`res` objects: half of what they do —
 * header casing, Express 5's read-only `req.query`, the four-argument error
 * handler, body parsing — is the framework's behaviour, and a fake `req` agrees
 * with a broken middleware as readily as with a working one.
 *
 * Every exchange under `/api/` is held to the contract (`API_ROUTES` in
 * `@ereuna/shared`): the route it reached must be listed there, and a success
 * must carry exactly what the route's response schema declares and have been
 * asked for with a path, body and query its request schemas take. A refusal is
 * held to the shared error body. The frontend's tests mock the API from the
 * same table, so an entry naming the wrong schema would let them test against
 * an API that does not exist; here it fails the request that exposed it.
 */
import type { Server } from 'node:http';

import express, { type Express, type RequestHandler } from 'express';
import pino from 'pino';
import { inject } from 'vitest';

import { errorProblems, requestProblems, responseProblems, routeOf } from '@ereuna/shared';
import { recordCheckedRoute } from '@ereuna/shared/contract-coverage';

import { portOf } from '@/__tests__/support/port.js';
import type { AuthRequest } from '@/middleware/auth.js';
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

    const contractProblems: string[] = [];
    app.use(holdToContract(contractProblems));
    mount(app);
    app.use(errorHandler);

    const server: Server = await new Promise((resolve) => {
        const started = app.listen(0, () => resolve(started));
    });

    const base = `http://127.0.0.1:${portOf(server)}`;

    return {
        app,
        call: async (path, init) => {
            const response = await fetch(`${base}${path}`, init);
            const text = await response.text();
            const problems = contractProblems.splice(0);
            if (problems.length > 0) throw new Error(`The answer breaks the API contract:\n${problems.join('\n')}`);
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

/** The request-scoped logger `requestId` normally binds: a real one, switched off. */
export const quietLogger: RequestHandler = (req, _res, next) => {
    req.log = pino({ enabled: false });
    next();
};

/** Pretend the request carried a valid access token for `userId`. */
export const asUser =
    (userId: string): RequestHandler =>
    (req: AuthRequest, _res, next) => {
        req.userId = userId;
        next();
    };

/** JSON request init, so a test reads as one line rather than four. */
export function json(body: unknown, method = 'POST'): RequestInit {
    return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

/**
 * Check each exchange under `/api/` against the contract as the app finishes it.
 * The body is copied before the router's validator rewrites it with what it
 * parsed. A 404 from no route at all is the app's, not a route's, so it is not
 * the contract's either.
 */
function holdToContract(problems: string[]): RequestHandler {
    return (req, res, next) => {
        const path = req.path;
        if (!path.startsWith('/api/')) {
            next();
            return;
        }
        const sentBody: unknown = structuredClone(req.body);
        const sentQuery = { ...req.query };
        let answered: unknown;
        const json = res.json.bind(res);
        res.json = (body: unknown) => {
            answered = body;
            return json(body);
        };
        res.on('finish', () => {
            if (res.statusCode >= 400) {
                problems.push(...errorProblems(answered).map((p) => `${req.method} ${path}: ${p}`));
                return;
            }
            const route = routeOf(req.method, path);
            if (route === undefined) {
                problems.push(`${req.method} ${path} answered ${res.statusCode}, but is not in API_ROUTES`);
                return;
            }
            recordCheckedRoute(inject('contractCoverageDir'), route);
            problems.push(...responseProblems(route, res.statusCode, answered));
            problems.push(...requestProblems(route, { path, body: sentBody, query: sentQuery }));
        });
        next();
    };
}

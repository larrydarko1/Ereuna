/**
 * The API, mocked at the network boundary, and held to the API's contract.
 *
 * MSW rather than a stubbed axios: the client under test is the axios instance
 * itself — its interceptors, its refresh race, its error localisation — and a
 * patched adapter would agree with a broken interceptor as readily as with a
 * working one. It also means these suites survive swapping axios for fetch.
 *
 * Every exchange a suite's handlers answer is checked against `API_ROUTES` in
 * `@ereuna/shared` — the table the API's own route tests check the routers
 * against — whether `on()` built the handler or the suite built its own. A suite
 * fails when it calls a route the API does not serve, sends a path, body or
 * query the API would refuse with a 422, or is answered with a body the API
 * never sends, a refusal included. Without that, a mock is a second,
 * hand-written API that can drift from the real one while every test stays green.
 */
import { http, HttpResponse, type JsonBodyType, type RequestHandler } from 'msw';
import { setupServer, type SetupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';

import { errorProblems, isList, isOneOf, isRecord, requestProblems, responseProblems, routeOf } from '@ereuna/shared';
import { recordCheckedRoute } from '@ereuna/shared/contract-coverage';

type Recorded = {
    method: string;
    path: string;
    search: URLSearchParams;
    headers: Headers;
    body: unknown;
};

type ApiMock = {
    server: SetupServer;
    /** Every request that reached a handler, oldest first. */
    calls: Recorded[];
    /** The last request that reached a handler. */
    last: () => Recorded;
    /**
     * Answer `METHOD /api/path` (concrete, or with the contract's `:params`) with
     * `body`, once or for the rest of the test. A 204 answers with no body.
     */
    on: (route: string, body: JsonBodyType, init?: { status?: number; once?: boolean }) => void;
};

/** The origin jsdom serves the app from, so a relative `/api` path resolves. */
export const ORIGIN = 'http://localhost:3000';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** The handler builder for each method a route string may start with. */
const HANDLERS: Record<(typeof METHODS)[number], typeof http.get> = {
    GET: http.get,
    POST: http.post,
    PUT: http.put,
    PATCH: http.patch,
    DELETE: http.delete,
};

/**
 * Start a server for one suite. Call at module scope; it registers its own
 * lifecycle hooks, and fails the test whose exchanges broke the contract.
 */
export function mockApi(): ApiMock {
    const calls: Recorded[] = [];
    const server = setupServer();
    const problems: string[] = [];
    const checking = new Set<Promise<void>>();
    // Each request's body, read as it starts: by the time it is answered, the handler may have consumed it.
    // An entry leaves when its request is answered, not between tests: a fire-and-forget write a test
    // started can be answered after the test ends, and must still be checked with what it sent
    const sentBodies = new Map<string, Promise<unknown>>();

    const track = (check: Promise<void>): void => {
        const settled = check
            .catch((err: unknown) => {
                problems.push(`contract check failed to run: ${String(err)}`);
            })
            .finally(() => checking.delete(settled));
        checking.add(settled);
    };

    server.events.on('request:start', ({ request, requestId }) => {
        const url = new URL(request.url);
        if (routeOf(request.method, url.pathname) === undefined) {
            problems.push(`${request.method} ${url.pathname} is not a route the API serves`);
        }
        sentBodies.set(requestId, bodyOf(request));
    });

    server.events.on('response:mocked', ({ request, requestId, response }) => {
        const sent = sentBodies.get(requestId) ?? Promise.resolve(undefined);
        sentBodies.delete(requestId);
        track(checkExchange(request, sent, response, problems));
    });

    const mock: ApiMock = {
        server,
        calls,
        last: () => {
            const entry = calls[calls.length - 1];
            if (entry === undefined) throw new Error('no request reached the API');
            return entry;
        },
        on: (route, body, init = {}) => {
            const [method = 'GET', path] = route.split(' ');
            if (!isOneOf(METHODS, method)) throw new Error(`no handler for the method in "${route}"`);
            const status = init.status ?? 200;
            const handler = HANDLERS[method](
                `${ORIGIN}${path ?? ''}`,
                async ({ request }) => {
                    calls.push(await record(request));
                    return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status });
                },
                init.once === true ? { once: true } : undefined,
            ) as RequestHandler;
            server.use(handler);
        },
    };

    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
    afterEach(async () => {
        server.resetHandlers();
        calls.length = 0;
        await Promise.all(checking);
        const found = problems.splice(0);
        if (found.length > 0) throw new Error(`The mocked API broke the API contract:\n${found.join('\n')}`);
    });
    afterAll(() => server.close());

    return mock;
}

/**
 * An answered exchange. A refusal is held to the shared error body, so a mock
 * cannot invent a code the API never sends. The request is held to the contract
 * only when the mock answered it with a success: a test that sends what the API
 * refuses and mocks the 422 is describing the API correctly.
 */
async function checkExchange(
    request: Request,
    sent: Promise<unknown>,
    response: Response,
    problems: string[],
): Promise<void> {
    const url = new URL(request.url);
    const route = routeOf(request.method, url.pathname);
    // An unserved route was reported when the request started
    if (route === undefined) return;
    const text = await response.clone().text();
    const body = text === '' ? undefined : parsedJson(text);
    if (response.status >= 400) {
        problems.push(...errorProblems(body).map((p) => `${route} ${response.status}: ${p}`));
        return;
    }
    recordCheckedRoute(inject('contractCoverageDir'), route);
    problems.push(...responseProblems(route, response.status, body));
    problems.push(
        ...requestProblems(route, { path: url.pathname, body: await sent, query: queryOf(url.searchParams) }),
    );
}

async function record(request: Request): Promise<Recorded> {
    const url = new URL(request.url);
    const text = await request.clone().text();
    return {
        method: request.method,
        path: url.pathname,
        search: url.searchParams,
        headers: request.headers,
        body: text === '' ? null : parsedJson(text),
    };
}

/** The JSON body, or `undefined` when there is none. */
async function bodyOf(request: Request): Promise<unknown> {
    const text = await request.clone().text();
    return text === '' ? undefined : parsedJson(text);
}

/** JSON text as a value, or the text itself when it is not JSON. */
function parsedJson(text: string): unknown {
    try {
        const parsed: unknown = JSON.parse(text);
        return isRecord(parsed) || isList(parsed) ? parsed : text;
    } catch {
        return text;
    }
}

/** The query as Express's parser hands it to a route: one string per key, a list for a repeated one. */
function queryOf(params: URLSearchParams): Record<string, string | string[]> {
    const query: Record<string, string | string[]> = {};
    for (const key of new Set(params.keys())) {
        const values = params.getAll(key);
        query[key] = values.length === 1 ? (values[0] ?? '') : values;
    }
    return query;
}

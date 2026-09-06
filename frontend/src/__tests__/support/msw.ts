/**
 * The API, mocked at the network boundary.
 *
 * MSW rather than a stubbed axios: the client under test is the axios instance
 * itself — its interceptors, its refresh race, its error localisation — and a
 * patched adapter would agree with a broken interceptor as readily as with a
 * working one. It also means these suites survive swapping axios for fetch.
 */
import { afterAll, afterEach, beforeAll } from 'vitest';
import { http, HttpResponse, type JsonBodyType, type RequestHandler } from 'msw';
import { setupServer, type SetupServer } from 'msw/node';

/** The origin jsdom serves the app from, so a relative `/api` path resolves. */
export const ORIGIN = 'http://localhost:3000';

type Recorded = {
    method: string;
    path: string;
    search: URLSearchParams;
    headers: Headers;
    body: unknown;
};

export type ApiMock = {
    server: SetupServer;
    /** Every request that reached a handler, oldest first. */
    calls: Recorded[];
    /** The last request that reached a handler. */
    last: () => Recorded;
    /** Answer `METHOD /api/path` with `body`, once or for the rest of the test. */
    on: (route: string, body: JsonBodyType, init?: { status?: number; once?: boolean }) => void;
};

const record = async (request: Request): Promise<Recorded> => {
    const url = new URL(request.url);
    let body: unknown = null;
    try {
        const text = await request.clone().text();
        body = text === '' ? null : JSON.parse(text);
    } catch {
        // A non-JSON body is legitimate; the tests that care read `calls` instead
    }
    return { method: request.method, path: url.pathname, search: url.searchParams, headers: request.headers, body };
};

/**
 * Start a server for one suite. Call at module scope; it registers its own
 * lifecycle hooks.
 */
export function mockApi(): ApiMock {
    const calls: Recorded[] = [];
    const server = setupServer();

    const mock: ApiMock = {
        server,
        calls,
        last: () => {
            const entry = calls[calls.length - 1];
            if (entry === undefined) throw new Error('no request reached the API');
            return entry;
        },
        on: (route, body, init = {}) => {
            const [method, path] = route.split(' ');
            const handler = http[(method ?? 'GET').toLowerCase() as 'get'](
                `${ORIGIN}${path ?? ''}`,
                async ({ request }) => {
                    calls.push(await record(request));
                    const status = init.status ?? 200;
                    return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status });
                },
                init.once === true ? { once: true } : undefined,
            ) as RequestHandler;
            server.use(handler);
        },
    };

    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        server.resetHandlers();
        calls.length = 0;
    });
    afterAll(() => server.close());

    return mock;
}

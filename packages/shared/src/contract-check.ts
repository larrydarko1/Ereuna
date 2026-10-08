/**
 * Holding an exchange to the API contract (contract.ts): which route a request
 * reaches, and what about its request or its answer the API would never send or
 * take. The frontend's mock server and the API's route tests both check through
 * these, so the two suites read one definition of "the API would refuse this".
 *
 * Test infrastructure by design: only the two suites call these, so each is
 * tagged `@public` for the dead-code gate. `droppedKeys` is the exception —
 * `validated()`, `send()` and the socket gateway use it in production too.
 */
import { z } from 'zod';

import { API_ROUTES, type ApiRoute, type Endpoint } from '#contract.js';
import { errorBodySchema } from '#errors.js';
import { isRecord } from '#guards.js';

/**
 * The route a request to `pathname` reaches, or `undefined` when the API serves
 * none. Where two routes take the same path (`/charts/search` and
 * `/charts/:symbol`), the fixed segment wins, as the routers order them.
 * A test may write a declared `:param` in place of a value.
 *
 * @public
 */
export function routeOf(method: string, pathname: string): ApiRoute | undefined {
    const given = pathname.split('/');
    let best: { route: ApiRoute; score: string } | undefined;
    for (const route of Object.keys(API_ROUTES).filter(isApiRoute)) {
        const [routeMethod, routePath = ''] = route.split(' ');
        if (routeMethod !== method.toUpperCase()) continue;
        const score = matchScore(routePath.split('/'), given);
        if (score !== undefined && (best === undefined || score > best.score)) best = { route, score };
    }
    return best?.route;
}

/** Narrow a string to a key of the contract. @public */
export function isApiRoute(key: string): key is ApiRoute {
    return Object.prototype.hasOwnProperty.call(API_ROUTES, key);
}

/**
 * Why the API would refuse this request on `route`, one line per reason; empty
 * when it would take it. `path` is the URL's pathname, its parameters read as
 * the router reads them; `body` is the parsed JSON; `query` holds each query
 * parameter as the API's parser reads it.
 *
 * @public
 */
export function requestProblems(
    route: ApiRoute,
    request: { path: string; body: unknown; query: Record<string, unknown> },
): string[] {
    const endpoint: Endpoint = API_ROUTES[route];
    const problems: string[] = [];
    if (endpoint.params !== undefined) {
        const params = paramsOf(route, request.path);
        problems.push(...exactProblems(endpoint.params, params).map((p) => `${route} path: ${p}`));
    }
    if (endpoint.body === undefined) {
        if (!isEmpty(request.body)) problems.push(`${route} takes no body, but got ${JSON.stringify(request.body)}`);
    } else {
        problems.push(...exactProblems(endpoint.body, request.body ?? {}).map((p) => `${route} body: ${p}`));
    }
    if (endpoint.query === undefined) {
        if (Object.keys(request.query).length > 0) {
            problems.push(`${route} takes no query, but got ${JSON.stringify(request.query)}`);
        }
    } else {
        problems.push(...exactProblems(endpoint.query, request.query).map((p) => `${route} query: ${p}`));
    }
    return problems;
}

/**
 * Why `route` could never answer `status` with `body`, one line per reason;
 * empty when it could. A refusal (4xx, 5xx) is `errorProblems`' to judge.
 *
 * @public
 */
export function responseProblems(route: ApiRoute, status: number, body: unknown): string[] {
    if (status >= 400) return [];
    const endpoint: Endpoint = API_ROUTES[route];
    if (endpoint.response === 'raw') return [];
    if (endpoint.response === null) {
        if (status !== 204) return [`${route} answers 204 with no body, not ${status}`];
        return isEmpty(body) ? [] : [`${route} answers with no body, but got ${JSON.stringify(body)}`];
    }
    return exactProblems(endpoint.response, body).map((p) => `${route} answer: ${p}`);
}

/**
 * Why `body` is not a refusal the API could send, one line per reason: a code
 * missing from `ERROR_CODES`, a field the error body does not declare, no body
 * at all. Every route refuses with the same body, so no route is named.
 *
 * @public
 */
export function errorProblems(body: unknown): string[] {
    return exactProblems(errorBodySchema, body).map((p) => `error body: ${p}`);
}

/**
 * Every key in `sent` that the parse left out of `kept`, as a dotted path
 * (`items.0.password`): what a Zod object strips without saying so. Only plain
 * objects and arrays are walked; a `Date` or an `ObjectId` is a value, not a
 * shape. A key holding `undefined` is not counted — JSON never carries it.
 */
export function droppedKeys(sent: unknown, kept: unknown, path: (string | number)[] = []): string[] {
    if (Array.isArray(sent)) {
        if (!Array.isArray(kept)) return [];
        return sent.flatMap((item, i) => droppedKeys(item, kept[i], [...path, i]));
    }
    if (!isPlainObject(sent) || !isRecord(kept)) return [];
    return Object.entries(sent).flatMap(([key, value]) => {
        if (value === undefined) return [];
        // Own keys only: every object inherits a `__proto__`, so `in` would find one the parse never kept
        if (!Object.prototype.hasOwnProperty.call(kept, key)) return [[...path, key].join('.')];
        return droppedKeys(value, kept[key], [...path, key]);
    });
}

/**
 * What stops `value` from passing `schema` with nothing stripped. A union passes
 * when any one option takes the value whole: the first option that parses may
 * be a narrower one that strips what a later option declares.
 */
function exactProblems(schema: z.core.$ZodType, value: unknown): string[] {
    if (schema instanceof z.core.$ZodUnion) {
        const each = schema._zod.def.options.map((option) => exactProblems(option, value));
        return each.some((problems) => problems.length === 0) ? [] : (each[0] ?? []);
    }
    const parsed = z.safeParse(schema, value);
    if (!parsed.success) return parsed.error.issues.map((i) => `${fieldOf(i.path)}: ${i.message}`);
    return droppedKeys(value, parsed.data).map((key) => `${key}: not a field the schema declares`);
}

/** An issue's path as the API's 422 names it: `items.0.title`, or `(root)` for the value itself. */
function fieldOf(path: readonly PropertyKey[]): string {
    return path.length === 0 ? '(root)' : path.map(String).join('.');
}

/** How well a route's segments match a path's: `undefined` for no match, otherwise higher for fixed segments earlier. */
function matchScore(route: string[], given: string[]): string | undefined {
    if (given.length !== route.length) return undefined;
    let score = '';
    for (const [i, part] of route.entries()) {
        const value = given[i];
        if (part.startsWith(':')) {
            if (value === undefined || value === '') return undefined;
            score += '0';
        } else {
            if (value !== part) return undefined;
            score += '1';
        }
    }
    return score;
}

/** The route's path parameters in `pathname`, decoded as Express decodes them. */
function paramsOf(route: ApiRoute, pathname: string): Record<string, string> {
    const given = pathname.split('/');
    const params: Record<string, string> = {};
    for (const [i, part] of (route.split(' ')[1] ?? '').split('/').entries()) {
        if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(given[i] ?? '');
    }
    return params;
}

/** No body: nothing sent, an empty string, or an object with no fields. */
function isEmpty(body: unknown): boolean {
    return body === undefined || body === null || body === '' || (isRecord(body) && Object.keys(body).length === 0);
}

/** An object literal or a JSON-parsed object, as opposed to a class instance. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!isRecord(value)) return false;
    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

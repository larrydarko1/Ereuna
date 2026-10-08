import { describe, it, expect } from 'vitest';

import { droppedKeys, errorProblems, isApiRoute, requestProblems, responseProblems, routeOf } from '#contract-check.js';

const ID = '507f1f77bcf86cd799439011';

const note = { id: ID, symbol: 'AAPL', message: 'm', createdAt: 'c', updatedAt: 'u' };

describe('routeOf', () => {
    it('finds the route a concrete path reaches', () => {
        expect(routeOf('patch', `/api/notes/${ID}`)).toBe('PATCH /api/notes/:id');
        expect(routeOf('GET', '/api/portfolios/2/trades')).toBe('GET /api/portfolios/:number/trades');
    });

    it('prefers a fixed segment over a parameter that would also take it, as the routers order them', () => {
        expect(routeOf('GET', '/api/charts/search')).toBe('GET /api/charts/search');
        expect(routeOf('GET', '/api/charts/AAPL')).toBe('GET /api/charts/:symbol');
        expect(routeOf('PUT', '/api/watchlists/order')).toBe('PUT /api/watchlists/order');
    });

    it('takes a declared :param written in place of a value', () => {
        expect(routeOf('GET', '/api/charts/:symbol/profile')).toBe('GET /api/charts/:symbol/profile');
    });

    it('answers undefined for a route the API does not serve', () => {
        expect(routeOf('GET', '/api/notes/a/b')).toBeUndefined();
        expect(routeOf('POST', '/api/market/stats')).toBeUndefined();
        expect(routeOf('GET', '/api/charts//profile')).toBeUndefined();
    });
});

describe('isApiRoute', () => {
    it('knows the contract keys and nothing else', () => {
        expect(isApiRoute('GET /api/notes')).toBe(true);
        expect(isApiRoute('GET /api/nothing')).toBe(false);
        expect(isApiRoute('toString')).toBe(false);
    });
});

describe('requestProblems', () => {
    it('passes a request the route takes', () => {
        const request = { path: '/api/notes', body: { symbol: 'AAPL', message: 'buy' }, query: {} };
        expect(requestProblems('POST /api/notes', request)).toEqual([]);
    });

    it('names a key the body schema does not declare — the API refuses it', () => {
        const request = { path: '/api/notes', body: { symbol: 'AAPL', message: 'buy', pinned: true }, query: {} };
        expect(requestProblems('POST /api/notes', request)).toEqual([
            'POST /api/notes body: pinned: not a field the schema declares',
        ]);
    });

    it('names a path parameter its schema refuses', () => {
        const problems = requestProblems('DELETE /api/notes/:id', {
            path: '/api/notes/nope',
            body: undefined,
            query: {},
        });
        expect(problems).toEqual(['DELETE /api/notes/:id path: id: id must be a valid MongoDB ObjectId']);
    });

    it('refuses a body or a query on a route that takes neither', () => {
        const problems = requestProblems('GET /api/market/stats', {
            path: '/api/market/stats',
            body: { x: 1 },
            query: { y: '2' },
        });
        expect(problems).toHaveLength(2);
    });

    it('reads a query as strings, the way the API parser hands it over', () => {
        const request = { path: '/api/notes', body: undefined, query: { page: '2', limit: '10' } };
        expect(requestProblems('GET /api/notes', request)).toEqual([]);
    });
});

describe('responseProblems', () => {
    it('passes an answer its schema sends whole', () => {
        expect(responseProblems('POST /api/notes', 201, note)).toEqual([]);
    });

    it('names a field the schema would drop', () => {
        expect(responseProblems('POST /api/notes', 201, { ...note, userId: ID })).toEqual([
            'POST /api/notes answer: userId: not a field the schema declares',
        ]);
    });

    it('takes any option of a union whole, not just the first that parses', () => {
        const session = {
            accessToken: 't',
            user: { id: ID, username: 'u', language: 'en', twoFactorEnabled: false, passwordResetRequired: false },
        };
        expect(responseProblems('POST /api/auth/login', 200, session)).toEqual([]);
        expect(responseProblems('POST /api/auth/login', 200, { requires2FA: true, tempToken: 't' })).toEqual([]);
        expect(responseProblems('POST /api/auth/login', 200, { requires2FA: true })).not.toEqual([]);
    });

    it('holds a body-less route to a 204 with nothing in it', () => {
        expect(responseProblems('DELETE /api/notes/:id', 204, undefined)).toEqual([]);
        expect(responseProblems('DELETE /api/notes/:id', 200, undefined)).toEqual([
            'DELETE /api/notes/:id answers 204 with no body, not 200',
        ]);
        expect(responseProblems('DELETE /api/notes/:id', 204, { ok: true })).toHaveLength(1);
    });

    it('leaves a file and a refusal to their own checks', () => {
        expect(responseProblems('GET /api/logos/:exchange/:file', 200, '<svg/>')).toEqual([]);
        expect(responseProblems('POST /api/notes', 404, { error: 'NOTE_NOT_FOUND' })).toEqual([]);
    });
});

describe('errorProblems', () => {
    it('passes a refusal with a shared code', () => {
        expect(errorProblems({ error: 'NOTE_NOT_FOUND' })).toEqual([]);
        expect(errorProblems({ error: 'VALIDATION_FAILED', errors: [{ field: 'x', message: 'm' }] })).toEqual([]);
    });

    it('names a code the shared list does not hold, and a refusal with no body', () => {
        expect(errorProblems({ error: 'NOT_A_CODE' })).toEqual([
            'error body: error: "NOT_A_CODE" is not in ERROR_CODES',
        ]);
        expect(errorProblems(undefined)).not.toEqual([]);
    });
});

describe('droppedKeys', () => {
    it('names each key the parse left out, by its dotted path', () => {
        const sent = { a: 1, b: { c: 2, d: 3 }, items: [{ e: 1, f: 2 }] };
        const kept = { a: 1, b: { c: 2 }, items: [{ e: 1 }] };
        expect(droppedKeys(sent, kept)).toEqual(['b.d', 'items.0.f']);
    });

    // Every object inherits both names, so a check with `in` finds them where the parse kept nothing
    it('counts an own `__proto__` or `constructor` key, the way JSON.parse makes one, that the parse left out', () => {
        expect(droppedKeys(JSON.parse('{"__proto__": {"admin": true}, "a": 1}'), { a: 1 })).toEqual(['__proto__']);
        expect(droppedKeys({ constructor: 1, a: 1 }, { a: 1 })).toEqual(['constructor']);
    });

    it('does not walk into a value that is not a plain object, nor count a key holding undefined', () => {
        expect(droppedKeys({ at: new Date(0), gone: undefined }, { at: new Date(0) })).toEqual([]);
    });
});

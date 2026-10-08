import { afterEach, describe, expect, it } from 'vitest';

import { json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';
import { at } from '@/__tests__/support/values.js';
import { sanitizeRequest } from '@/middleware/sanitizer.js';

let harness: Harness | null = null;

/** Echoes back what the sanitizer left of the body and the query. */
async function echoing(): Promise<Harness> {
    harness = await serve((app) => {
        app.use(quietLogger);
        app.use(sanitizeRequest);
        app.all('/echo', (req, res) => {
            res.json({ body: req.body as unknown, query: req.query });
        });
    });
    return harness;
}

afterEach(async () => {
    await harness?.close();
    harness = null;
});

describe('the body', () => {
    it('leaves an ordinary payload untouched', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json({ symbol: 'AAPL', shares: 10 }));
        expect(at(response.body, 'body')).toEqual({ symbol: 'AAPL', shares: 10 });
    });

    it.each([
        ['a Mongo operator', { $ne: null }],
        ['a dotted key, which addresses a nested field', { 'user.role': 'admin' }],
        // An own `__proto__` key, the way JSON.parse makes one, rather than the prototype itself
        ['__proto__', Object.defineProperty({}, '__proto__', { value: { admin: true }, enumerable: true })],
        ['constructor', { constructor: 'x' }],
        ['prototype', { prototype: 'x' }],
    ])('refuses %s, rather than answering a probe with a 2xx', async (_label, payload) => {
        const { call } = await echoing();
        const response = await call('/echo', json({ ...payload, keep: 1 }));
        expect(response.status).toBe(422);
        expect(response.body).toEqual({ error: 'VALIDATION_FAILED' });
    });

    it('refuses a nested operator, not just a top-level one', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json({ filter: { name: 'x', $where: 'sleep(1)' } }));
        expect(response.status).toBe(422);
    });

    it('refuses an operator inside an array element', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json({ rows: [{ $gt: 1, symbol: 'AAPL' }] }));
        expect(response.status).toBe(422);
    });

    it('passes a request with no body through untouched', async () => {
        const { call } = await echoing();
        const response = await call('/echo');
        expect(response.body).not.toHaveProperty('body');
    });

    it('refuses an operator inside a top-level array body', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json([{ $ne: 1, symbol: 'AAPL' }]));
        expect(response.status).toBe(422);
    });

    it('leaves a value that merely looks like an operator alone — only keys are stripped', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json({ note: '$ne is a mongo operator' }));
        expect(at(response.body, 'body')).toEqual({ note: '$ne is a mongo operator' });
    });
});

describe('the query string', () => {
    it('leaves ordinary parameters alone', async () => {
        const { call } = await echoing();
        const response = await call('/echo?symbol=AAPL&limit=10');
        expect(at(response.body, 'query')).toEqual({ symbol: 'AAPL', limit: '10' });
    });

    it('refuses an operator key', async () => {
        const { call } = await echoing();
        const response = await call('/echo?%24ne=1&symbol=AAPL');
        expect(response.status).toBe(422);
    });

    it('leaves a bracketed key flat — the simple parser never builds it into an operator object', async () => {
        const { call } = await echoing();
        const response = await call('/echo?filter[%24gt]=1&filter[name]=x');
        expect(at(response.body, 'query')).toEqual({ 'filter[$gt]': '1', 'filter[name]': 'x' });
    });

    it('refuses a dotted key', async () => {
        const { call } = await echoing();
        const response = await call('/echo?user.role=admin&symbol=AAPL');
        expect(response.status).toBe(422);
    });

    // Express 5 re-parses the query on every read, so the handler sees the
    // checked copy only because the getter is shadowed
    it('is still readable by the handler after being shadowed', async () => {
        const { call } = await echoing();
        const response = await call('/echo?a=1&b=2');
        expect(at(response.body, 'query')).toEqual({ a: '1', b: '2' });
    });
});

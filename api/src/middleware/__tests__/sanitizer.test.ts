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
    ])('strips %s', async (_label, payload) => {
        const { call } = await echoing();
        const response = await call('/echo', json({ ...payload, keep: 1 }));
        expect(at(response.body, 'body')).toEqual({ keep: 1 });
    });

    it('strips a nested operator, not just a top-level one', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json({ filter: { name: 'x', $where: 'sleep(1)' } }));
        expect(at(response.body, 'body')).toEqual({ filter: { name: 'x' } });
    });

    it('strips inside an array element', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json({ rows: [{ $gt: 1, symbol: 'AAPL' }] }));
        expect(at(response.body, 'body')).toEqual({ rows: [{ symbol: 'AAPL' }] });
    });

    it('passes a request with no body through untouched', async () => {
        const { call } = await echoing();
        const response = await call('/echo');
        expect(response.body).not.toHaveProperty('body');
    });

    it('strips inside a top-level array body', async () => {
        const { call } = await echoing();
        const response = await call('/echo', json([{ $ne: 1, symbol: 'AAPL' }]));
        expect(at(response.body, 'body')).toEqual([{ symbol: 'AAPL' }]);
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

    it('strips an operator key — Express 5 re-parses the query on every read, so it has to be shadowed', async () => {
        const { call } = await echoing();
        const response = await call('/echo?%24ne=1&symbol=AAPL');
        expect(at(response.body, 'query')).toEqual({ symbol: 'AAPL' });
    });

    it('leaves a bracketed key flat — the simple parser never builds it into an operator object', async () => {
        const { call } = await echoing();
        const response = await call('/echo?filter[%24gt]=1&filter[name]=x');
        expect(at(response.body, 'query')).toEqual({ 'filter[$gt]': '1', 'filter[name]': 'x' });
    });

    it('strips a dotted key', async () => {
        const { call } = await echoing();
        const response = await call('/echo?user.role=admin&symbol=AAPL');
        expect(at(response.body, 'query')).toEqual({ symbol: 'AAPL' });
    });

    it('is still readable by the handler after being shadowed', async () => {
        const { call } = await echoing();
        const response = await call('/echo?a=1&b=2');
        expect(at(response.body, 'query')).toEqual({ a: '1', b: '2' });
    });
});

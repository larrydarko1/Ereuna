import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validated } from '@/middleware/validate.js';
import { AppError } from '@/lib/app-error.js';
import { json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

let harness: Harness | null = null;

afterEach(async () => {
    await harness?.close();
    harness = null;
});

describe('the body', () => {
    it('hands the handler coerced data rather than the raw payload', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.post(
                '/t',
                ...validated({ body: z.object({ shares: z.coerce.number() }) }, (req, res) => {
                    res.json({ shares: req.body.shares, type: typeof req.body.shares });
                }),
            );
        });

        await expect(harness.call('/t', json({ shares: '10' })).then((r) => r.body)).resolves.toEqual({
            shares: 10,
            type: 'number',
        });
    });

    it('answers 422 with the field that failed, and never reaches the handler', async () => {
        let reached = false;
        harness = await serve((app) => {
            app.use(quietLogger);
            app.post(
                '/t',
                ...validated({ body: z.object({ shares: z.number() }) }, (_req, res) => {
                    reached = true;
                    res.json({ ok: true });
                }),
            );
        });

        const response = await harness.call('/t', json({ shares: 'lots' }));
        expect(response.status).toBe(422);
        expect(response.body).toMatchObject({ error: 'VALIDATION_FAILED', errors: [{ field: 'shares' }] });
        expect(reached).toBe(false);
    });
});

describe('params and query', () => {
    it('coerces a path parameter in place', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get(
                '/t/:number',
                ...validated({ params: z.object({ number: z.coerce.number().int() }) }, (req, res) => {
                    res.json({ number: req.params.number, type: typeof req.params.number });
                }),
            );
        });

        await expect(harness.call('/t/3').then((r) => r.body)).resolves.toEqual({ number: 3, type: 'number' });
    });

    it('puts parsed query on `validatedQuery`, because Express 5 makes `query` read-only', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get(
                '/t',
                ...validated({ query: z.object({ limit: z.coerce.number().default(24) }) }, (req, res) => {
                    res.json({ validated: req.validatedQuery, raw: req.query });
                }),
            );
        });

        await expect(harness.call('/t?limit=5').then((r) => r.body)).resolves.toEqual({
            validated: { limit: 5 },
            raw: { limit: '5' },
        });
    });

    it('applies a schema default when the caller sent nothing', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get(
                '/t',
                ...validated({ query: z.object({ limit: z.coerce.number().default(24) }) }, (req, res) => {
                    res.json(req.validatedQuery);
                }),
            );
        });

        await expect(harness.call('/t').then((r) => r.body)).resolves.toEqual({ limit: 24 });
    });
});

describe('aggregating failures', () => {
    it('reports every field across every part in one response', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.post(
                '/t/:id',
                ...validated(
                    {
                        body: z.object({ shares: z.number(), price: z.number() }),
                        params: z.object({ id: z.string().regex(/^[0-9]+$/) }),
                        query: z.object({ limit: z.number() }),
                    },
                    (_req, res) => void res.json({ ok: true }),
                ),
            );
        });

        const response = await harness.call('/t/abc?limit=x', json({ shares: 'a', price: 'b' }));
        const body = response.body as { errors: { field: string }[] };
        expect(response.status).toBe(422);
        expect(body.errors.map((issue) => issue.field).sort()).toEqual(['id', 'limit', 'price', 'shares']);
    });

    it('names a root-level failure as root rather than leaving the field empty', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.post('/t', ...validated({ body: z.string() }, (_req, res) => void res.json({ ok: true })));
        });

        const body = (await harness.call('/t', json({ a: 1 }))).body as { errors: { field: string }[] };
        expect(body.errors[0]?.field).toBe('(root)');
    });
});

describe('the handler', () => {
    it('runs with no schemas at all', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get('/t', ...validated({}, (_req, res) => void res.json({ ok: true })));
        });
        await expect(harness.call('/t').then((r) => r.body)).resolves.toEqual({ ok: true });
    });

    it('sends a rejected async handler to the error boundary rather than hanging the request', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get('/t', ...validated({}, () => Promise.reject(new AppError(404, 'NOT_FOUND', 'gone'))));
        });

        const response = await harness.call('/t');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'NOT_FOUND' });
    });

    it('sends a synchronous throw to the boundary too', async () => {
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get(
                '/t',
                ...validated({}, () => {
                    throw new AppError(403, 'FORBIDDEN', 'not yours');
                }),
            );
        });

        await expect(harness.call('/t').then((r) => r.status)).resolves.toBe(403);
    });
});

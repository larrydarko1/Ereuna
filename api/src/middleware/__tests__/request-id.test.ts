import { afterEach, describe, expect, it } from 'vitest';
import { requestId } from '@/middleware/request-id.js';
import { serve, type Harness } from '@/__tests__/support/http.js';

let harness: Harness | null = null;

const UUID = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

/** Echoes the id the middleware settled on, and whether it bound a logger. */
async function correlating(): Promise<Harness> {
    harness = await serve((app) => {
        app.use(requestId);
        app.get('/x', (req, res) => {
            res.json({ id: req.id, hasLogger: typeof req.log?.warn === 'function' });
        });
    });
    return harness;
}

afterEach(async () => {
    await harness?.close();
    harness = null;
});

describe('requestId', () => {
    it('generates a uuid when the caller sends none', async () => {
        const { call } = await correlating();
        const response = await call('/x');
        expect((response.body as { id: string }).id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
    });

    it('propagates a well-formed inbound id', async () => {
        const { call } = await correlating();
        const response = await call('/x', { headers: { 'x-request-id': UUID } });
        expect((response.body as { id: string }).id).toBe(UUID);
    });

    it('accepts an inbound id in upper case', async () => {
        const { call } = await correlating();
        const response = await call('/x', { headers: { 'x-request-id': UUID.toUpperCase() } });
        expect((response.body as { id: string }).id).toBe(UUID.toUpperCase());
    });

    it('trims an inbound id before judging it', async () => {
        const { call } = await correlating();
        const response = await call('/x', { headers: { 'x-request-id': ` ${UUID} ` } });
        expect((response.body as { id: string }).id).toBe(UUID);
    });

    it.each([
        ['not a uuid at all', 'my-request'],
        ['the right length but not hex', 'zzzzzzzz-5e6f-4a7b-8c9d-0e1f2a3b4c5d'],
        ['too long', `${UUID}0`],
        ['whitespace only', '   '],
    ])('replaces an inbound id that is %s', async (_label, supplied) => {
        const { call } = await correlating();
        const response = await call('/x', { headers: { 'x-request-id': supplied } });
        expect((response.body as { id: string }).id).not.toBe(supplied.trim());
    });

    it('replaces an id carrying a space, which an unvalidated one could use to forge a log line', async () => {
        const { call } = await correlating();
        const response = await call('/x', { headers: { 'x-request-id': `${UUID.slice(0, 30)} abcde` } });
        expect((response.body as { id: string }).id).not.toContain(' ');
    });

    it('returns the id on the response, so a client can correlate its own logs', async () => {
        const { call } = await correlating();
        const response = await call('/x', { headers: { 'x-request-id': UUID } });
        expect(response.headers.get('x-request-id')).toBe(UUID);
    });

    it('binds a request-scoped logger, which is what lets the boundary log once with correlation', async () => {
        const { call } = await correlating();
        expect((await call('/x')).body).toMatchObject({ hasLogger: true });
    });

    it('gives two requests different ids', async () => {
        const { call } = await correlating();
        const first = (await call('/x')).body as { id: string };
        const second = (await call('/x')).body as { id: string };
        expect(first.id).not.toBe(second.id);
    });
});

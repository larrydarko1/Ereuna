import { Router } from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { quietLogger, serve, type Harness } from '@/__tests__/support/http.js';
import { AppError } from '@/lib/app-error.js';
import { send } from '@/lib/send.js';

const userSchema = z.object({ id: z.string(), name: z.string() });

let harness: Harness | null = null;

/** send() inside a real route: what the client received, and what send() threw on the way. */
async function sendThrough<TSchema extends z.ZodType>(
    schema: TSchema,
    data: z.input<TSchema>,
): Promise<{ status: number; body: unknown; thrown: unknown }> {
    let thrown: unknown;
    const router = Router();
    router.get('/', (_req, res) => {
        try {
            send(res, schema, data);
        } catch (err) {
            thrown = err;
            throw err;
        }
    });
    harness = await serve((app) => app.use('/', quietLogger, router));
    const { status, body } = await harness.call('/');
    return { status, body, thrown };
}

afterEach(async () => {
    await harness?.close();
    harness = null;
});

describe('send', () => {
    it('sends only the fields the schema lists', async () => {
        const doc = { id: 'u1', name: 'alice', passwordHash: 'hash', totpSecretEncrypted: 'cipher' };
        const { status, body } = await sendThrough(userSchema, doc);
        expect(status).toBe(200);
        expect(body).toEqual({ id: 'u1', name: 'alice' });
    });

    it('drops unknown fields at any depth', async () => {
        const pageSchema = z.object({ items: z.array(userSchema) });
        const page = { items: [{ id: 'u1', name: 'alice', recoveryCodeHashes: ['hash'] }] };
        const { body } = await sendThrough(pageSchema, page);
        expect(body).toEqual({ items: [{ id: 'u1', name: 'alice' }] });
    });

    it('turns data that does not fit its schema into a 500, not a 422', async () => {
        // The types allow 1.5; the schema does not. That is the gap send() exists to close
        const countSchema = z.object({ id: z.string(), count: z.number().int() });
        const { status, body, thrown } = await sendThrough(countSchema, { id: 'u1', count: 1.5 });
        expect(thrown).toBeInstanceOf(AppError);
        expect(thrown).toMatchObject({ status: 500, code: 'INTERNAL' });
        expect(status).toBe(500);
        expect(body).toEqual({ error: 'INTERNAL' });
    });

    it('logs which field failed, never its value', async () => {
        const labelSchema = z.object({ label: z.string().max(4) });
        const { body, thrown } = await sendThrough(labelSchema, { label: 'sk_live_secret_value' });
        const issues = thrown instanceof AppError ? thrown.logContext?.['issues'] : undefined;
        expect(issues).toContain('label:');
        expect(issues).not.toContain('sk_live_secret_value');
        expect(JSON.stringify(body)).not.toContain('sk_live_secret_value');
    });
});

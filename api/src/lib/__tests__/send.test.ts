import { Router, type RequestHandler } from 'express';
import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { serve, type Harness } from '@/__tests__/support/http.js';
import { AppError } from '@/lib/app-error.js';
import { send } from '@/lib/send.js';

const mode = vi.hoisted(() => ({ isDev: true }));

vi.mock('@/lib/config.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/config.js')>();
    return {
        config: {
            ...actual.config,
            get isDev(): boolean {
                return mode.isDev;
            },
        },
    };
});

const userSchema = z.object({ id: z.string(), name: z.string() });

let harness: Harness | null = null;

/** Every line the request logger wrote, as JSON. */
const logged: string[] = [];

const capturingLogger: RequestHandler = (req, _res, next) => {
    req.log = pino({ level: 'error' }, { write: (line: string) => logged.push(line) });
    next();
};

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
    harness = await serve((app) => app.use('/', capturingLogger, router));
    const { status, body } = await harness.call('/');
    return { status, body, thrown };
}

afterEach(async () => {
    await harness?.close();
    harness = null;
    mode.isDev = true;
    logged.length = 0;
});

describe('send', () => {
    it('sends data that fits its schema exactly', async () => {
        const { status, body } = await sendThrough(userSchema, { id: 'u1', name: 'alice' });
        expect(status).toBe(200);
        expect(body).toEqual({ id: 'u1', name: 'alice' });
    });

    it('fails outside production on a field the schema does not declare, naming it', async () => {
        const doc = { id: 'u1', name: 'alice', passwordHash: 'hash' };
        const { status, body, thrown } = await sendThrough(userSchema, doc);
        expect(status).toBe(500);
        expect(body).toEqual({ error: 'INTERNAL' });
        expect(thrown).toMatchObject({ status: 500, logContext: { dropped: 'passwordHash' } });
    });

    it('names an undeclared field at any depth by its path', async () => {
        const pageSchema = z.object({ items: z.array(userSchema) });
        const page = { items: [{ id: 'u1', name: 'alice', recoveryCodeHashes: ['hash'] }] };
        const { thrown } = await sendThrough(pageSchema, page);
        expect(thrown).toMatchObject({ logContext: { dropped: 'items.0.recoveryCodeHashes' } });
    });

    it('in production, keeps the page working without the field and logs it by name', async () => {
        mode.isDev = false;
        const doc = { id: 'u1', name: 'alice', passwordHash: 'sk_live_secret_value' };
        const { status, body } = await sendThrough(userSchema, doc);
        expect(status).toBe(200);
        expect(body).toEqual({ id: 'u1', name: 'alice' });
        expect(logged.join('')).toContain('passwordHash');
        expect(logged.join('')).not.toContain('sk_live_secret_value');
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

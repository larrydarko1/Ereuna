import express, { type RequestHandler } from 'express';
import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';

import { isRecord } from '@ereuna/shared';

import { serve, type Harness } from '@/__tests__/support/http.js';
import { failedFieldsOf } from '@/__tests__/support/values.js';
import { AppError } from '@/lib/app-error.js';

let harness: Harness | null = null;

const logs: { level: string; payload: Record<string, unknown>; message: string }[] = [];

/**
 * Binds a `req.log` that records, since the handler logs through the request. It is a real
 * logger: the hook sees each call's arguments before they are serialised, so a test can still
 * ask whether `err` is the error that was thrown, and nothing is written anywhere.
 */
const recordingLogger: RequestHandler = (req, _res, next) => {
    req.log = pino({
        level: 'debug',
        hooks: {
            logMethod(args: unknown[], _method, level) {
                const [payload, message] = args;
                logs.push({
                    level: pino.levels.labels[level] ?? String(level),
                    payload: isRecord(payload) ? payload : {},
                    message: typeof message === 'string' ? message : '',
                });
            },
        },
    });
    next();
};

async function throwing(err: unknown): Promise<Harness> {
    logs.length = 0;
    harness = await serve((app) => {
        app.use(recordingLogger);
        app.get('/boom', () => {
            throw err;
        });
    });
    return harness;
}

afterEach(async () => {
    await harness?.close();
    harness = null;
    vi.restoreAllMocks();
});

describe('an AppError', () => {
    it('answers with its status and its code, never its English message', async () => {
        const { call } = await throwing(new AppError(404, 'SCREENER_NOT_FOUND', 'screener "growth" not found'));
        const response = await call('/boom');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'SCREENER_NOT_FOUND' });
        expect(response.text).not.toContain('growth');
    });

    it('puts interpolation params on the wire next to the code', async () => {
        const { call } = await throwing(
            new AppError(400, 'FILTER_RANGE_INVALID', 'bad range', { params: { min: 1, max: 100 } }),
        );
        await expect(call('/boom').then((r) => r.body)).resolves.toEqual({
            error: 'FILTER_RANGE_INVALID',
            params: { min: 1, max: 100 },
        });
    });

    it('never sends a stack trace', async () => {
        const { call } = await throwing(new AppError(500, 'INTERNAL', 'boom'));
        const response = await call('/boom');
        expect(response.text).not.toContain('at ');
    });

    it('logs a 4xx as a warning and a 5xx as an error', async () => {
        const client = await throwing(new AppError(404, 'NOT_FOUND', 'nope'));
        await client.call('/boom');
        expect(logs[0]?.level).toBe('warn');
        await harness?.close();

        const server = await throwing(new AppError(500, 'INTERNAL', 'boom'));
        await server.call('/boom');
        expect(logs[0]?.level).toBe('error');
    });

    it("merges the throw site's log context into the one boundary line", async () => {
        const { call } = await throwing(
            new AppError(403, 'FORBIDDEN', 'not yours', { logContext: { op: 'portfolio.read', userId: 'abc' } }),
        );
        await call('/boom');
        expect(logs[0]?.payload).toMatchObject({ op: 'portfolio.read', userId: 'abc', code: 'FORBIDDEN', status: 403 });
    });

    it('logs the English message, which is the half that never reaches the client', async () => {
        const { call } = await throwing(new AppError(404, 'NOT_FOUND', 'screener "growth" not found'));
        await call('/boom');
        expect(logs[0]?.message).toBe('screener "growth" not found');
    });

    it('attaches ip and user-agent only to a security event', async () => {
        const routine = await throwing(new AppError(401, 'MISSING_TOKEN', 'no token'));
        await routine.call('/boom');
        expect(logs[0]?.payload).not.toHaveProperty('ip');
        await harness?.close();

        const flagged = await throwing(new AppError(401, 'INVALID_TOKEN', 'bad token', { securityEvent: true }));
        await flagged.call('/boom', { headers: { 'user-agent': 'curl/8' } });
        expect(logs[0]?.payload).toMatchObject({ userAgent: 'curl/8' });
        expect(logs[0]?.payload).toHaveProperty('ip');
    });

    it('does not let a stray logContext shadow the real client context', async () => {
        const { call } = await throwing(
            new AppError(401, 'INVALID_TOKEN', 'bad', { securityEvent: true, logContext: { ip: 'forged' } }),
        );
        await call('/boom');
        expect(logs[0]?.payload['ip']).not.toBe('forged');
    });
});

describe('a stray ZodError', () => {
    it('is answered in the same shape the validate middleware uses', async () => {
        const error = new ZodError(z.object({ shares: z.number() }).safeParse({ shares: 'lots' }).error?.issues ?? []);
        const { call } = await throwing(error);
        const response = await call('/boom');

        expect(response.status).toBe(422);
        expect(response.body).toMatchObject({
            error: 'VALIDATION_FAILED',
            errors: [{ field: 'shares' }],
        });
    });

    it('names a root-level failure `(root)` rather than leaving the field empty', async () => {
        const error = new ZodError(z.string().safeParse(42).error?.issues ?? []);
        const { call } = await throwing(error);
        expect(failedFieldsOf((await call('/boom')).body)).toEqual(['(root)']);
    });
});

describe('anything else', () => {
    it('is answered with a bare INTERNAL and nothing about the cause', async () => {
        const { call } = await throwing(new TypeError('cannot read property of undefined'));
        const response = await call('/boom');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'INTERNAL' });
        expect(response.text).not.toContain('cannot read');
    });

    it('is logged in full, because it is a bug rather than an expected failure', async () => {
        const { call } = await throwing(new TypeError('boom'));
        await call('/boom');
        expect(logs[0]?.level).toBe('error');
        expect(logs[0]?.message).toBe('Unhandled error');
        expect(logs[0]?.payload['err']).toBeInstanceOf(TypeError);
    });

    it('handles a thrown non-Error without itself throwing', async () => {
        const { call } = await throwing('just a string');
        await expect(call('/boom').then((r) => r.status)).resolves.toBe(500);
    });
});

describe('a body the parser refused', () => {
    // The logger before the parser, as index.ts orders requestId: a refused body
    // that reaches the handler with nowhere to log is the 500 this branch replaced
    async function parsing(): Promise<Harness> {
        logs.length = 0;
        harness = await serve(
            (app) => {
                app.use(recordingLogger, express.json({ limit: '1mb' }));
                app.post('/t', (_req, res) => {
                    res.json({ ok: true });
                });
            },
            { parseJson: false },
        );
        return harness;
    }

    it('answers malformed JSON with a 400 the client can read, not a 500', async () => {
        const { call } = await parsing();
        const response = await call('/t', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"shares": 1',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'MALFORMED_REQUEST' });
        expect(logs.map((entry) => entry.level)).toEqual(['warn']);
    });

    it('answers a body over the size cap with a 413', async () => {
        const { call } = await parsing();
        const response = await call('/t', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ blob: 'x'.repeat(1024 * 1024 + 1) }),
        });

        expect(response.status).toBe(413);
        expect(response.body).toEqual({ error: 'REQUEST_TOO_LARGE' });
    });
});

import { afterEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { authedUserId, optionalAuth, requireAuth } from '@/middleware/auth.js';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

let harness: Harness | null = null;

const USER_ID = '507f1f77bcf86cd799439011';

const sign = (payload: object, options: jwt.SignOptions = {}): string =>
    jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', ...options });

const bearer = (token: string): RequestInit => ({ headers: { authorization: `Bearer ${token}` } });

/** An app that reports whichever user id the middleware resolved. */
async function guarded(middleware: typeof requireAuth): Promise<Harness> {
    harness = await serve((app) => {
        app.use(quietLogger);
        app.get('/who', middleware, (req, res) => {
            res.json({ userId: (req as { userId?: string }).userId ?? null });
        });
    });
    return harness;
}

afterEach(async () => {
    await harness?.close();
    harness = null;
});

describe('requireAuth', () => {
    it('resolves the user id from a valid token', async () => {
        const { call } = await guarded(requireAuth);
        const response = await call('/who', bearer(sign({ sub: USER_ID })));
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ userId: USER_ID });
    });

    it.each([
        ['no header at all', undefined],
        ['a header that is not Bearer', 'Basic abc'],
        ['Bearer with nothing after it', 'Bearer '],
        ['Bearer with only whitespace', 'Bearer    '],
        ['the wrong case', 'bearer abc'],
    ])('rejects %s as a missing token', async (_label, header) => {
        const { call } = await guarded(requireAuth);
        const init = header === undefined ? {} : { headers: { authorization: header } };
        const response = await call('/who', init);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'MISSING_TOKEN' });
    });

    it.each([
        ['a token signed with another secret', jwt.sign({ sub: USER_ID }, 'a-different-secret-that-is-long-enough')],
        ['a token that is not a JWT', 'not.a.token'],
        ['an expired token', jwt.sign({ sub: USER_ID }, config.jwt.secret, { expiresIn: '-1s' })],
    ])('rejects %s as invalid', async (_label, token) => {
        const { call } = await guarded(requireAuth);
        const response = await call('/who', bearer(token));

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'INVALID_TOKEN' });
    });

    it('refuses an unsigned token — the algorithm is pinned, so `alg: none` is not accepted', async () => {
        const unsigned = jwt.sign({ sub: USER_ID }, '', { algorithm: 'none' });
        const { call } = await guarded(requireAuth);
        expect((await call('/who', bearer(unsigned))).body).toEqual({ error: 'INVALID_TOKEN' });
    });

    it('refuses a subject that is not an ObjectId, so it cannot reach a query', async () => {
        const { call } = await guarded(requireAuth);
        expect((await call('/who', bearer(sign({ sub: 'not-an-id' })))).body).toEqual({ error: 'INVALID_TOKEN' });
    });

    it('refuses a token carrying no subject', async () => {
        const { call } = await guarded(requireAuth);
        expect((await call('/who', bearer(sign({})))).body).toEqual({ error: 'INVALID_TOKEN' });
    });

    it('tolerates whitespace around the token itself', async () => {
        const { call } = await guarded(requireAuth);
        const response = await call('/who', { headers: { authorization: `Bearer ${sign({ sub: USER_ID })}  ` } });
        expect(response.status).toBe(200);
    });
});

describe('optionalAuth', () => {
    it('resolves the user id when a valid token is present', async () => {
        const { call } = await guarded(optionalAuth);
        expect((await call('/who', bearer(sign({ sub: USER_ID })))).body).toEqual({ userId: USER_ID });
    });

    it('continues anonymously with no token', async () => {
        const { call } = await guarded(optionalAuth);
        const response = await call('/who');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ userId: null });
    });

    it('continues anonymously with a token it cannot verify, rather than rejecting', async () => {
        const { call } = await guarded(optionalAuth);
        const response = await call('/who', bearer('not.a.token'));
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ userId: null });
    });
});

describe('authedUserId', () => {
    it('converts the resolved id into an ObjectId', () => {
        expect(authedUserId({ userId: USER_ID })).toEqual(new ObjectId(USER_ID));
    });

    it.each([
        ['undefined', undefined],
        ['the empty string', ''],
    ])('throws MISSING_TOKEN when the id is %s', (_label, userId) => {
        expect(() => authedUserId({ userId })).toThrow(AppError);
        try {
            authedUserId({ userId });
        } catch (err) {
            expect((err as AppError).code).toBe('MISSING_TOKEN');
            expect((err as AppError).status).toBe(401);
            expect((err as AppError).securityEvent).toBe(true);
        }
    });
});

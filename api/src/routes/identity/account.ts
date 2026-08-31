/**
 * Account routes — mounted at /api/account (all require authentication)
 * GET    /api/account                  — the current user
 * PATCH  /api/account/password         — change password, revoking every session
 * PATCH  /api/account/username         — change username
 * DELETE /api/account                  — delete the account and everything it owns
 * POST   /api/account/2fa              — begin TOTP enrolment, return secret + URI
 * POST   /api/account/2fa/confirm      — confirm enrolment, return recovery codes
 * DELETE /api/account/2fa              — disable TOTP
 * POST   /api/account/recovery-codes   — regenerate recovery codes
 * GET    /api/account/recovery-codes   — how many codes remain
 */
import { Router } from 'express';
import { z } from 'zod';
import { passwordSchema, requiredString, usernameSchema } from '@/lib/schemas.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as authService from '@/services/auth/index.js';
import * as userService from '@/services/user/index.js';

const changePasswordBody = z.object({
    currentPassword: requiredString('Current password is required'),
    newPassword: passwordSchema,
});

const changeUsernameBody = z.object({
    password: requiredString('Password is required'),
    username: usernameSchema,
});

const confirmPasswordBody = z.object({ password: requiredString('Password is required') });
const totpCodeBody = z.object({ code: requiredString('Two-factor code is required') });

export const router = Router();

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        res.json(await userService.getAccount(authedUserId(req)));
    }),
);

router.patch(
    '/password',
    ...validated({ body: changePasswordBody }, async (req, res): Promise<void> => {
        await userService.changePassword(authedUserId(req), req.body.currentPassword, req.body.newPassword);
        res.json({ ok: true });
    }),
);

router.patch(
    '/username',
    ...validated({ body: changeUsernameBody }, async (req, res): Promise<void> => {
        res.json(await userService.changeUsername(authedUserId(req), req.body.password, req.body.username));
    }),
);

router.delete(
    '/',
    ...validated({ body: confirmPasswordBody }, async (req, res): Promise<void> => {
        await userService.deleteAccount(authedUserId(req), req.body.password);
        res.json({ ok: true });
    }),
);

router.post(
    '/2fa',
    ...validated({}, async (req, res): Promise<void> => {
        res.json(await authService.beginTotpEnrolment(authedUserId(req)));
    }),
);

router.post(
    '/2fa/confirm',
    ...validated({ body: totpCodeBody }, async (req, res): Promise<void> => {
        res.json(await authService.confirmTotpEnrolment(authedUserId(req), req.body.code));
    }),
);

router.delete(
    '/2fa',
    ...validated({ body: totpCodeBody }, async (req, res): Promise<void> => {
        await authService.disableTotp(authedUserId(req), req.body.code);
        res.json({ ok: true });
    }),
);

router.post(
    '/recovery-codes',
    ...validated({}, async (req, res): Promise<void> => {
        res.json({ recoveryCodes: await authService.regenerateRecoveryCodes(authedUserId(req)) });
    }),
);

router.get(
    '/recovery-codes',
    ...validated({}, async (req, res): Promise<void> => {
        res.json({ remaining: await authService.countRemainingCodes(authedUserId(req)) });
    }),
);

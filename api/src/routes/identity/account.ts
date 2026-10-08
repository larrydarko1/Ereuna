/**
 * Account routes — mounted at /api/account (all require authentication)
 * GET    /api/account                  — the current user
 * PATCH  /api/account/password         — change password, revoking every session
 * PATCH  /api/account/username         — change username
 * DELETE /api/account                  — delete the account and everything it owns
 * POST   /api/account/2fa              — begin TOTP enrolment, return secret + URI
 * POST   /api/account/2fa/confirm      — confirm enrolment, return recovery codes
 * DELETE /api/account/2fa              — disable TOTP, on the password and a live code
 * POST   /api/account/recovery-codes   — regenerate recovery codes, on the password
 * GET    /api/account/recovery-codes   — how many codes remain
 * POST   /api/account/recovery-password — set a password after a recovery-code login
 */
import { Router } from 'express';

import {
    changePasswordBody,
    changeUsernameBody,
    confirmPasswordBody,
    disableTotpBody,
    newPasswordBody,
    recoveryCodeCountSchema,
    recoveryCodesSchema,
    sessionUserSchema,
    totpCodeBody,
    totpEnrolmentSchema,
} from '@ereuna/shared';

import { send } from '@/lib/send.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as authService from '@/services/auth/index.js';
import * as userService from '@/services/user/index.js';

export const router = Router();

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        send(res, sessionUserSchema, await userService.getAccount(authedUserId(req)));
    }),
);

router.patch(
    '/password',
    ...validated({ body: changePasswordBody }, async (req, res): Promise<void> => {
        await userService.changePassword(authedUserId(req), req.body.currentPassword, req.body.newPassword);
        res.status(204).end();
    }),
);

router.patch(
    '/username',
    ...validated({ body: changeUsernameBody }, async (req, res): Promise<void> => {
        const user = await userService.changeUsername(authedUserId(req), req.body.password, req.body.username);
        send(res, sessionUserSchema, user);
    }),
);

router.delete(
    '/',
    ...validated({ body: confirmPasswordBody }, async (req, res): Promise<void> => {
        await userService.deleteAccount(authedUserId(req), req.body.password);
        res.status(204).end();
    }),
);

router.post(
    '/2fa',
    ...validated({}, async (req, res): Promise<void> => {
        send(res, totpEnrolmentSchema, await authService.beginTotpEnrolment(authedUserId(req)));
    }),
);

router.post(
    '/2fa/confirm',
    ...validated({ body: totpCodeBody }, async (req, res): Promise<void> => {
        send(res, recoveryCodesSchema, await authService.confirmTotpEnrolment(authedUserId(req), req.body.code));
    }),
);

router.delete(
    '/2fa',
    ...validated({ body: disableTotpBody }, async (req, res): Promise<void> => {
        await authService.disableTotp(authedUserId(req), req.body.password, req.body.code);
        res.status(204).end();
    }),
);

router.post(
    '/recovery-codes',
    ...validated({ body: confirmPasswordBody }, async (req, res): Promise<void> => {
        const recoveryCodes = await authService.regenerateRecoveryCodes(authedUserId(req), req.body.password);
        send(res, recoveryCodesSchema, { recoveryCodes });
    }),
);

router.get(
    '/recovery-codes',
    ...validated({}, async (req, res): Promise<void> => {
        send(res, recoveryCodeCountSchema, { remaining: await authService.countRemainingCodes(authedUserId(req)) });
    }),
);

// No current password: the session that reaches this was opened with a
// recovery code, and the service refuses unless that is what happened
router.post(
    '/recovery-password',
    ...validated({ body: newPasswordBody }, async (req, res): Promise<void> => {
        await userService.setPasswordAfterRecovery(authedUserId(req), req.body.newPassword);
        res.status(204).end();
    }),
);

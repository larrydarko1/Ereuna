import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const authService = {
    beginTotpEnrolment: vi.fn(),
    confirmTotpEnrolment: vi.fn(),
    disableTotp: vi.fn(),
    regenerateRecoveryCodes: vi.fn(),
    countRemainingCodes: vi.fn(),
};

const userService = {
    getAccount: vi.fn(),
    changePassword: vi.fn(),
    changeUsername: vi.fn(),
    deleteAccount: vi.fn(),
    setPasswordAfterRecovery: vi.fn(),
};

vi.mock('@/services/auth/index.js', () => authService);
vi.mock('@/services/user/index.js', () => userService);

const { router } = await import('@/routes/identity/account.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);
const STRONG = 'Str0ng!passw0rd';

let harness: Harness;

beforeEach(async () => {
    authService.beginTotpEnrolment.mockResolvedValue({ secret: 'S', uri: 'otpauth://x' });
    authService.confirmTotpEnrolment.mockResolvedValue(['code-1']);
    authService.disableTotp.mockResolvedValue(undefined);
    authService.regenerateRecoveryCodes.mockResolvedValue(['code-1', 'code-2']);
    authService.countRemainingCodes.mockResolvedValue(7);
    userService.getAccount.mockResolvedValue({ username: 'larry' });
    userService.changePassword.mockResolvedValue(undefined);
    userService.changeUsername.mockResolvedValue({ username: 'newname' });
    userService.deleteAccount.mockResolvedValue(undefined);
    userService.setPasswordAfterRecovery.mockResolvedValue(undefined);
    harness = await serve((app) => app.use('/api/account', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('GET /api/account', () => {
    it('answers with the current user', async () => {
        const response = await harness.call('/api/account');

        expect(response.body).toEqual({ username: 'larry' });
        expect(userService.getAccount).toHaveBeenCalledWith(USER_ID);
    });
});

describe('PATCH /api/account/password', () => {
    it('answers 204 and never echoes the new password', async () => {
        const response = await harness.call(
            '/api/account/password',
            json({ currentPassword: 'old', newPassword: STRONG }, 'PATCH'),
        );

        expect(response.status).toBe(204);
        expect(response.text).toBe('');
        expect(userService.changePassword).toHaveBeenCalledWith(USER_ID, 'old', STRONG);
    });

    it('refuses a new password that fails the strength rules', async () => {
        const response = await harness.call(
            '/api/account/password',
            json({ currentPassword: 'old', newPassword: 'weak' }, 'PATCH'),
        );

        expect(response.status).toBe(422);
        const body = response.body as { errors: { field: string; message: string }[] };
        expect(body.errors.length).toBeGreaterThan(1);
        expect(userService.changePassword).not.toHaveBeenCalled();
    });

    it('requires the current password', async () => {
        const response = await harness.call('/api/account/password', json({ newPassword: STRONG }, 'PATCH'));

        expect(response.status).toBe(422);
    });
});

describe('PATCH /api/account/username', () => {
    it('answers with the renamed account', async () => {
        const response = await harness.call(
            '/api/account/username',
            json({ password: 'old', username: 'newname' }, 'PATCH'),
        );

        expect(response.body).toEqual({ username: 'newname' });
        expect(userService.changeUsername).toHaveBeenCalledWith(USER_ID, 'old', 'newname');
    });

    it('refuses a username carrying characters the schema does not allow', async () => {
        const response = await harness.call(
            '/api/account/username',
            json({ password: 'old', username: 'new name!' }, 'PATCH'),
        );

        expect(response.status).toBe(422);
    });
});

describe('DELETE /api/account', () => {
    it('takes the password in the body and answers 204', async () => {
        const response = await harness.call('/api/account', json({ password: 'old' }, 'DELETE'));

        expect(response.status).toBe(204);
        expect(userService.deleteAccount).toHaveBeenCalledWith(USER_ID, 'old');
    });

    it('refuses a deletion with no password', async () => {
        const response = await harness.call('/api/account', json({}, 'DELETE'));

        expect(response.status).toBe(422);
        expect(userService.deleteAccount).not.toHaveBeenCalled();
    });
});

describe('two-factor enrolment', () => {
    it('begins enrolment with no body at all', async () => {
        const response = await harness.call('/api/account/2fa', { method: 'POST' });

        expect(response.body).toEqual({ secret: 'S', uri: 'otpauth://x' });
        expect(authService.beginTotpEnrolment).toHaveBeenCalledWith(USER_ID);
    });

    it('confirms enrolment and answers with the recovery codes', async () => {
        const response = await harness.call('/api/account/2fa/confirm', json({ code: '123456' }));

        expect(response.body).toEqual(['code-1']);
        expect(authService.confirmTotpEnrolment).toHaveBeenCalledWith(USER_ID, '123456');
    });

    it('requires a code to confirm', async () => {
        const response = await harness.call('/api/account/2fa/confirm', json({}));

        expect(response.status).toBe(422);
    });

    it('disables two-factor on the password and a live code', async () => {
        const response = await harness.call('/api/account/2fa', json({ password: 'old', code: '123456' }, 'DELETE'));

        expect(response.status).toBe(204);
        expect(authService.disableTotp).toHaveBeenCalledWith(USER_ID, 'old', '123456');
    });

    it('refuses to disable two-factor on the password alone', async () => {
        const response = await harness.call('/api/account/2fa', json({ password: 'old' }, 'DELETE'));

        expect(response.status).toBe(422);
        expect(authService.disableTotp).not.toHaveBeenCalled();
    });
});

describe('recovery codes', () => {
    it('regenerates them on the password', async () => {
        const response = await harness.call('/api/account/recovery-codes', json({ password: 'old' }));

        expect(response.body).toEqual({ recoveryCodes: ['code-1', 'code-2'] });
    });

    it('counts the ones that remain', async () => {
        const response = await harness.call('/api/account/recovery-codes');

        expect(response.body).toEqual({ remaining: 7 });
    });
});

describe('POST /api/account/recovery-password', () => {
    it('takes no current password — the session was opened with a recovery code', async () => {
        const response = await harness.call('/api/account/recovery-password', json({ newPassword: STRONG }));

        expect(response.status).toBe(204);
        expect(userService.setPasswordAfterRecovery).toHaveBeenCalledWith(USER_ID, STRONG);
    });

    it('still holds the new password to the strength rules', async () => {
        const response = await harness.call('/api/account/recovery-password', json({ newPassword: 'weak' }));

        expect(response.status).toBe(422);
    });
});

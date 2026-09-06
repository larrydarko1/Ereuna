import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import {
    beginTwoFactor,
    changePassword,
    changeUsername,
    confirmTwoFactor,
    countRecoveryCodes,
    deleteAccount,
    disableTwoFactor,
    getAccount,
    regenerateRecoveryCodes,
    setPasswordAfterRecovery,
} from '@/api/account';

const mock = mockApi();

describe('reads', () => {
    it('gets the account', async () => {
        mock.on('GET /api/account', { username: 'larry' });

        const { data } = await getAccount();

        expect(data).toEqual({ username: 'larry' });
        expect(mock.last().method).toBe('GET');
    });

    it('counts the recovery codes that remain', async () => {
        mock.on('GET /api/account/recovery-codes', { remaining: 7 });

        await expect(countRecoveryCodes()).resolves.toMatchObject({ data: { remaining: 7 } });
    });
});

describe('credential changes', () => {
    it('sends both passwords on a password change', async () => {
        mock.on('PATCH /api/account/password', null, { status: 204 });

        await changePassword('old', 'new');

        expect(mock.last().body).toEqual({ currentPassword: 'old', newPassword: 'new' });
    });

    it('re-authenticates a username change', async () => {
        mock.on('PATCH /api/account/username', { username: 'newname' });

        await changeUsername('pw', 'newname');

        expect(mock.last().body).toEqual({ password: 'pw', username: 'newname' });
    });

    it('sends the password in the body of the delete, where a query string cannot log it', async () => {
        mock.on('DELETE /api/account', null, { status: 204 });

        await deleteAccount('pw');

        expect(mock.last().body).toEqual({ password: 'pw' });
        expect(mock.last().search.toString()).toBe('');
    });

    it('sets a password after a recovery login with no current password', async () => {
        mock.on('POST /api/account/recovery-password', null, { status: 204 });

        await setPasswordAfterRecovery('new');

        expect(mock.last().body).toEqual({ newPassword: 'new' });
    });
});

describe('two-factor', () => {
    it('begins enrolment with no body', async () => {
        mock.on('POST /api/account/2fa', { secret: 'S', uri: 'otpauth://x' });

        const { data } = await beginTwoFactor();

        expect(data).toEqual({ secret: 'S', uri: 'otpauth://x' });
        expect(mock.last().body).toBeNull();
    });

    it('confirms enrolment with the code', async () => {
        mock.on('POST /api/account/2fa/confirm', { recoveryCodes: ['a'] });

        await confirmTwoFactor('123456');

        expect(mock.last().body).toEqual({ code: '123456' });
    });

    it('requires both factors to disable it', async () => {
        mock.on('DELETE /api/account/2fa', null, { status: 204 });

        await disableTwoFactor('pw', '123456');

        expect(mock.last().body).toEqual({ password: 'pw', code: '123456' });
    });

    it('re-authenticates a regeneration of the recovery codes', async () => {
        mock.on('POST /api/account/recovery-codes', { recoveryCodes: ['a', 'b'] });

        await regenerateRecoveryCodes('pw');

        expect(mock.last().body).toEqual({ password: 'pw' });
    });
});

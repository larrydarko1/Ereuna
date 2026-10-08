/** account — API wrappers for /api/account. */
import type { AnswerOf, SessionUser, TotpEnrolment } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

type RecoveryCodes = AnswerOf<'POST /api/account/recovery-codes'>;

export function getAccount(): ApiResult<SessionUser> {
    return call('GET /api/account');
}

export function changePassword(currentPassword: string, newPassword: string): ApiResult<void> {
    return call('PATCH /api/account/password', { body: { currentPassword, newPassword } });
}

export function changeUsername(password: string, username: string): ApiResult<SessionUser> {
    return call('PATCH /api/account/username', { body: { password, username } });
}

export function deleteAccount(password: string): ApiResult<void> {
    return call('DELETE /api/account', { body: { password } });
}

export function beginTwoFactor(): ApiResult<TotpEnrolment> {
    return call('POST /api/account/2fa');
}

export function confirmTwoFactor(code: string): ApiResult<RecoveryCodes> {
    return call('POST /api/account/2fa/confirm', { body: { code } });
}

/** Both factors, not just the second: dropping 2FA must not be possible for
 *  someone holding only the authenticator, or only a live session. */
export function disableTwoFactor(password: string, code: string): ApiResult<void> {
    return call('DELETE /api/account/2fa', { body: { password, code } });
}

/** Re-authenticated: a fresh set voids the old one, and each code it issues
 *  signs in on its own. */
export function regenerateRecoveryCodes(password: string): ApiResult<RecoveryCodes> {
    return call('POST /api/account/recovery-codes', { body: { password } });
}

/** Only accepted on a session opened with a recovery code — there is no
 *  current password to re-authenticate with, which is why it was used. */
export function setPasswordAfterRecovery(newPassword: string): ApiResult<void> {
    return call('POST /api/account/recovery-password', { body: { newPassword } });
}

export function countRecoveryCodes(): ApiResult<AnswerOf<'GET /api/account/recovery-codes'>> {
    return call('GET /api/account/recovery-codes');
}

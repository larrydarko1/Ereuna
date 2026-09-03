/** account — API wrappers for /api/account. */
import { api, type ApiResult, type SessionUser } from '@/api/client';

export type TotpEnrolment = {
    secret: string;
    uri: string; // otpauth:// URI, for the QR code
};

export function getAccount(): ApiResult<SessionUser> {
    return api.get<SessionUser>('/account');
}

export function changePassword(currentPassword: string, newPassword: string): ApiResult<{ ok: true }> {
    return api.patch<{ ok: true }>('/account/password', { currentPassword, newPassword });
}

export function changeUsername(password: string, username: string): ApiResult<SessionUser> {
    return api.patch<SessionUser>('/account/username', { password, username });
}

export function deleteAccount(password: string): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>('/account', { data: { password } });
}

export function beginTwoFactor(): ApiResult<TotpEnrolment> {
    return api.post<TotpEnrolment>('/account/2fa');
}

export function confirmTwoFactor(code: string): ApiResult<{ recoveryCodes: string[] }> {
    return api.post<{ recoveryCodes: string[] }>('/account/2fa/confirm', { code });
}

/** Both factors, not just the second: dropping 2FA must not be possible for
 *  someone holding only the authenticator, or only a live session. */
export function disableTwoFactor(password: string, code: string): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>('/account/2fa', { data: { password, code } });
}

/** Re-authenticated: a fresh set voids the old one, and each code it issues
 *  signs in on its own. */
export function regenerateRecoveryCodes(password: string): ApiResult<{ recoveryCodes: string[] }> {
    return api.post<{ recoveryCodes: string[] }>('/account/recovery-codes', { password });
}

/** Only accepted on a session opened with a recovery code — there is no
 *  current password to re-authenticate with, which is why it was used. */
export function setPasswordAfterRecovery(newPassword: string): ApiResult<{ ok: true }> {
    return api.post<{ ok: true }>('/account/recovery-password', { newPassword });
}

export function countRecoveryCodes(): ApiResult<{ remaining: number }> {
    return api.get<{ remaining: number }>('/account/recovery-codes');
}

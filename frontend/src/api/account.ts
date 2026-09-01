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

/** Disabling 2FA is confirmed with a live TOTP code, not the password:
 *  the point of the second factor is that the first one alone is not enough. */
export function disableTwoFactor(code: string): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>('/account/2fa', { data: { code } });
}

export function regenerateRecoveryCodes(): ApiResult<{ recoveryCodes: string[] }> {
    return api.post<{ recoveryCodes: string[] }>('/account/recovery-codes');
}

export function countRecoveryCodes(): ApiResult<{ remaining: number }> {
    return api.get<{ remaining: number }>('/account/recovery-codes');
}

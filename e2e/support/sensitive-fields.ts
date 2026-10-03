/**
 * Fields that must never appear in an API response, per collection — checked by
 * the response-leak tripwire in every E2E test, by name and by stored value.
 * Typed against the document types, so a renamed field breaks the typecheck
 * instead of silently dropping out of the check.
 *
 * Deliberately absent, because they are sent on purpose to the one person they
 * belong to: the TOTP `secret` during enrolment and the `recoveryCodes` when
 * they are generated. Neither is stored as itself — the secret is held
 * encrypted and the codes hashed, and it is those stored forms that are listed.
 */
import type { RefreshTokenDoc, UserDoc } from '@ereuna/shared/db/collections';

type FieldsOf<T> = readonly Extract<keyof T, string>[];

const USER_FIELDS = [
    'passwordHash',
    'totpSecretEncrypted',
    'pendingTotpSecretEncrypted',
    'recoveryCodeHashes',
] as const satisfies FieldsOf<UserDoc>;

/** The refresh token travels only in its httpOnly cookie; what is stored is its hash and its family. */
const REFRESH_TOKEN_FIELDS = ['tokenHash', 'familyId'] as const satisfies FieldsOf<RefreshTokenDoc>;

export const SENSITIVE_FIELDS = {
    Users: USER_FIELDS,
    RefreshTokens: REFRESH_TOKEN_FIELDS,
};

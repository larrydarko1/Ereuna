/**
 * Response schemas for /api/auth, /api/account and /api/preferences. Each one is
 * the list of fields a response may carry: the api answers through `send()`,
 * which parses the data with the schema, and a Zod object drops every key it
 * does not declare — so a field only leaves the server once it is written here.
 * The frontend's types are inferred from the same schemas, so the two sides
 * cannot drift.
 *
 * Two fields here are secrets on purpose, sent once to the person they belong
 * to: the TOTP `secret` while 2FA is being set up, and the `recoveryCodes` when
 * they are generated. The refresh token is never in a body — it travels only in
 * its httpOnly cookie.
 *
 * Name every field: the api-standards gate rejects the shapes that let unknown
 * fields through (`z.looseObject`, `.passthrough()`, `z.unknown()`, a record of
 * strings, …).
 */
import { z } from 'zod';

import { CHART_STYLES, CHART_TIMEFRAMES, PANEL_SECTIONS, SUMMARY_FIELDS } from '#db/collections.js';

/** Who is signed in — the `user` block every sign-in answers with, and GET /account. */
export const sessionUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    language: z.string(),
    twoFactorEnabled: z.boolean(),
    passwordResetRequired: z.boolean(), // Raised by a recovery-code login, which opens a session with no password
});

/** POST /auth/register (201), /auth/2fa/validate, /auth/recover, and /auth/login without 2FA */
export const authSessionSchema = z.object({ accessToken: z.string(), user: sessionUserSchema });

/** POST /auth/login when the account has 2FA: no tokens yet, only a short-lived ticket for the second step. */
export const twoFactorChallengeSchema = z.object({ requires2FA: z.literal(true), tempToken: z.string() });

/** POST /auth/refresh */
export const accessTokenSchema = z.object({ accessToken: z.string() });

/** POST /account/2fa — the otpauth URI for the QR code, and the same secret for typing in by hand. */
export const totpEnrolmentSchema = z.object({ secret: z.string(), uri: z.string() });

/** POST /account/2fa/confirm and POST /account/recovery-codes — shown once, never again. */
export const recoveryCodesSchema = z.object({ recoveryCodes: z.array(z.string()) });

/** GET /account/recovery-codes */
export const recoveryCodeCountSchema = z.object({ remaining: z.number().int().nonnegative() });

const chartIndicatorSchema = z.object({
    type: z.enum(['SMA', 'EMA']),
    period: z.number().int().positive(),
    visible: z.boolean(),
});

const chartSettingsSchema = z.object({
    style: z.enum(CHART_STYLES),
    indicators: z.partialRecord(z.enum(CHART_TIMEFRAMES), z.array(chartIndicatorSchema)),
});

const panelLayoutSchema = z.object({
    sections: z.array(z.enum(PANEL_SECTIONS)),
    summaryFields: z.array(z.enum(SUMMARY_FIELDS)),
});

/** GET and PATCH /preferences — the slice of the user document the interface reads and writes. */
export const preferencesSchema = z.object({
    language: z.string(),
    theme: z.string().nullable(),
    defaultSymbol: z.string(),
    hiddenSymbols: z.array(z.string()),
    chartSettings: chartSettingsSchema.nullable(),
    panels: panelLayoutSchema.nullable(),
    screenerColumns: z.array(z.string()),
});

/** POST and DELETE /preferences/hidden/:symbol */
export const hiddenSymbolsSchema = preferencesSchema.pick({ hiddenSymbols: true });

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type TwoFactorChallenge = z.infer<typeof twoFactorChallengeSchema>;
export type TotpEnrolment = z.infer<typeof totpEnrolmentSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;

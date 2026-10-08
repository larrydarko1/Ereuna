/**
 * Request schemas for /api/auth, /api/account and /api/preferences. The API
 * validates with these and the frontend builds its request types from them
 * (see requests/fields.ts), so a form cannot send a field the route refuses.
 */
import { z } from 'zod';

import { CHART_STYLES, CHART_TIMEFRAMES, PANEL_SECTIONS, SUMMARY_FIELDS } from '#db/collections.js';
import { LIMITS } from '#limits.js';
import { passwordSchema, requiredString, symbolField, usernameField } from '#requests/fields.js';

const rememberMe = z.boolean().optional();

const chartIndicatorBody = z.object({
    type: z.enum(['SMA', 'EMA']),
    period: z.number().int().min(1).max(LIMITS.maxIndicatorPeriod),
    visible: z.boolean(),
});

/** POST /auth/register */
export const registerBody = z.object({ username: usernameField, password: passwordSchema });

/** POST /auth/login */
export const loginBody = z.object({
    username: requiredString('Username is required'),
    password: requiredString('Password is required'),
    rememberMe,
});

/** POST /auth/2fa/validate */
export const twoFactorBody = z.object({
    tempToken: requiredString('Temp token is required'),
    code: requiredString('Two-factor code is required'),
    rememberMe,
});

/** POST /auth/recover */
export const recoverBody = z.object({
    username: requiredString('Username is required'),
    recoveryCode: requiredString('Recovery code is required'),
    rememberMe,
});

/** PATCH /account/password */
export const changePasswordBody = z.object({
    currentPassword: requiredString('Current password is required'),
    newPassword: passwordSchema,
});

/** PATCH /account/username */
export const changeUsernameBody = z.object({
    password: requiredString('Password is required'),
    username: usernameField,
});

/** DELETE /account and POST /account/recovery-codes: the password, asked again. */
export const confirmPasswordBody = z.object({ password: requiredString('Password is required') });

/** POST /account/2fa/confirm */
export const totpCodeBody = z.object({ code: requiredString('Two-factor code is required') });

/** DELETE /account/2fa */
export const disableTotpBody = z.object({
    password: requiredString('Password is required'),
    code: requiredString('Two-factor code is required'),
});

/** POST /account/recovery-password */
export const newPasswordBody = z.object({ newPassword: passwordSchema });

// Partial, not exhaustive: a client that has only ever configured the daily
// chart sends the one key it has, and every other timeframe keeps the defaults
const chartSettingsBody = z.object({
    style: z.enum(CHART_STYLES),
    indicators: z.partialRecord(z.enum(CHART_TIMEFRAMES), z.array(chartIndicatorBody).max(LIMITS.indicatorsPerChart)),
});

/** A key listed twice would render one row in two places. The fuzz document says it as `uniqueItems`. */
const noDuplicates = {
    check: (keys: readonly string[]): boolean => new Set(keys).size === keys.length,
    message: 'Each key may appear only once',
};

const panelLayoutBody = z.object({
    sections: z
        .array(z.enum(PANEL_SECTIONS))
        .max(PANEL_SECTIONS.length)
        .refine(noDuplicates.check, noDuplicates.message)
        .meta({ uniqueItems: true }),
    summaryFields: z
        .array(z.enum(SUMMARY_FIELDS))
        .max(SUMMARY_FIELDS.length)
        .refine(noDuplicates.check, noDuplicates.message)
        .meta({ uniqueItems: true }),
});

/**
 * PATCH /preferences — any of them, at least one. Each is left out rather than
 * sent as `undefined`, so a client can fold its patch over what it holds.
 */
export const updatePreferencesBody = z
    .object({
        language: z.string().trim().min(2).max(10).exactOptional(),
        theme: z.string().trim().max(40).nullable().exactOptional(),
        defaultSymbol: symbolField.exactOptional(),
        chartSettings: chartSettingsBody.nullable().exactOptional(),
        panels: panelLayoutBody.nullable().exactOptional(),
        screenerColumns: z.array(z.string().trim().min(1).max(60)).max(100).exactOptional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'At least one preference is required' });

/**
 * The field rules request schemas are built from. Every request schema lives in
 * this package, beside the response it answers: the API validates with it and
 * the frontend builds its request types from it, so neither side can send or
 * expect a field the other does not know (see contract.ts).
 *
 * The messages are what a 422 lists under `errors[].message`.
 */
import { z } from 'zod';

import { LIMITS } from '#limits.js';

type QueryDigits = z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;

type QueryCountField = z.ZodPipe<QueryDigits, z.ZodNumber>;

type PaginationQuerySchema = z.ZodObject<
    {
        page: z.ZodDefault<QueryCountField>;
        limit: z.ZodDefault<QueryCountField>;
    },
    z.core.$strip
>;

/**
 * What a client may put in a query string for `schema`: the parsed values, each
 * optional. The schema reads them from the URL's strings, so its own input type
 * is the string, not the value the client holds.
 */
export type QueryParams<TSchema extends z.ZodType> = Partial<z.output<TSchema>>;

/** OWASP-aligned password strength rules. */
export const passwordSchema = z.string().superRefine((val, ctx) => {
    const add = (message: string): void => ctx.addIssue({ code: 'custom', message });
    if (val.length < 8 || val.length > 128) add('Password must be 8–128 characters');
    if (!/[A-Z]/.test(val)) add('Password must contain an uppercase letter');
    if (!/[a-z]/.test(val)) add('Password must contain a lowercase letter');
    if (!/[0-9]/.test(val)) add('Password must contain a number');
    if (!/[^A-Za-z0-9]/.test(val)) add('Password must contain a special character');
});

export const usernameField = z
    .string({ error: 'Username is required' })
    .trim()
    .min(3, 'Username must be 3–30 characters')
    .max(30, 'Username must be 3–30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores');

/**
 * A ticker symbol. Deliberately narrow: symbols reach Mongo queries and cache
 * keys, and the character class is what keeps them from carrying anything else.
 */
export const symbolField = z
    .string({ error: 'Symbol is required' })
    .trim()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be at most 20 characters')
    .regex(/^[A-Za-z0-9.\-^]+$/, 'Symbol may only contain letters, numbers, dots, hyphens and carets')
    .transform((v) => v.toUpperCase());

/** A user-supplied resource name (screener, watchlist). */
export const resourceNameField = z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be at most 60 characters');

/**
 * 0-based portfolio slot, below the number of slots a user has, read from the
 * path segment. Named rather than coerced: `z.coerce.number()` reads a lone
 * space as 0, and `/portfolios/%20/leverage` wrote to the first slot. As names,
 * the fuzz document lists every slot there is.
 */
export const portfolioNumberField = z
    .enum(
        Array.from({ length: LIMITS.portfolioSlots }, (_, slot) => String(slot)),
        'Portfolio must be a slot number',
    )
    .transform(Number);

/** An instant with its offset, or a calendar date: what a trade date, a filter bound or a `before` cursor takes. */
export const isoDateField = z.iso.datetime({ offset: true }).or(z.iso.date());

/**
 * Free text a route searches with: at least one character, with no padding at
 * either end and no NUL anywhere. The API turns it into a regex, and a regex
 * reaches MongoDB as a C string, which cannot hold a NUL: one would fail the
 * query as a 500. Padding is refused rather than trimmed, because the search box
 * trims before it sends, and a trim here would take what the fuzz document's one
 * pattern refuses. Padding is every character `trim()` removes: ECMAScript's
 * white space and line terminators.
 */
export const searchField = (max: number): z.ZodString =>
    z
        .string({ error: 'A search term is required' })
        .min(1, 'A search term is required')
        .max(max)
        .regex(
            /^[^\0\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff](?:[^\0]*[^\0\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff])?$/,
            'A search term must not start or end with a space, or hold a NUL character',
        );

/** A MongoDB ObjectId string (24 hex chars). */
export const mongoId = (name: string): z.ZodString =>
    z.string().regex(/^[0-9a-fA-F]{24}$/, `${name} must be a valid MongoDB ObjectId`);

export const requiredString = (message: string): z.ZodString => z.string({ error: message }).min(1, message);

/**
 * A number read from a query string, written as plain digits; the field pipes
 * it into its bounds. Not coerced: `z.coerce.number()` runs `Number()`, which
 * reads `1e1` as 10, `0x10` as 16 and `1.0` as 1, so one page had many
 * spellings. The digits are the one a client writes.
 */
export const queryDigits = (message: string): QueryDigits =>
    z
        .string({ error: message })
        .regex(/^[1-9][0-9]*$/, message)
        .transform(Number);

export const makePaginationQuery = ({ defaultLimit = 24, maxLimit = 100 } = {}): PaginationQuerySchema =>
    z.object({
        page: queryDigits('page must be a positive integer')
            .pipe(z.number().int().min(1, 'page must be a positive integer'))
            .default(1),
        limit: queryDigits(`limit must be 1–${maxLimit}`)
            .pipe(z.number().int().min(1, `limit must be 1–${maxLimit}`).max(maxLimit, `limit must be 1–${maxLimit}`))
            .default(defaultLimit),
    });

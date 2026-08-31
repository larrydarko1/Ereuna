/** Shared Zod schemas for request validation — the vocabulary route schemas are built from. */
import { z } from 'zod';

export type PaginationQuerySchema = z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}>;

/** OWASP-aligned password strength rules. */
export const passwordSchema = z.string().superRefine((val, ctx) => {
    const add = (message: string): void => ctx.addIssue({ code: 'custom', message });
    if (val.length < 8 || val.length > 128) add('Password must be 8–128 characters');
    if (!/[A-Z]/.test(val)) add('Password must contain an uppercase letter');
    if (!/[a-z]/.test(val)) add('Password must contain a lowercase letter');
    if (!/[0-9]/.test(val)) add('Password must contain a number');
    if (!/[^A-Za-z0-9]/.test(val)) add('Password must contain a special character');
});

export const usernameSchema = z
    .string({ error: 'Username is required' })
    .trim()
    .min(3, 'Username must be 3–30 characters')
    .max(30, 'Username must be 3–30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores');

/**
 * A ticker symbol. Deliberately narrow: symbols reach Mongo queries and cache
 * keys, and the character class is what keeps them from carrying anything else.
 */
export const symbolSchema = z
    .string({ error: 'Symbol is required' })
    .trim()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be at most 20 characters')
    .regex(/^[A-Za-z0-9.\-^]+$/, 'Symbol may only contain letters, numbers, dots, hyphens and carets')
    .transform((v) => v.toUpperCase());

/** A user-supplied resource name (screener, watchlist). */
export const resourceNameSchema = z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be at most 60 characters');

/** A MongoDB ObjectId string (24 hex chars). */
export const mongoId = (name: string): z.ZodString =>
    z.string().regex(/^[0-9a-fA-F]{24}$/, `${name} must be a valid MongoDB ObjectId`);

export const idParam = z.object({ id: mongoId('id') });

export const requiredString = (message: string): z.ZodString => z.string({ error: message }).min(1, message);

/** 0-based portfolio slot. The upper bound comes from config, not from the caller. */
export const portfolioNumberSchema = z.coerce
    .number('Portfolio must be a slot number')
    .int()
    .min(0, 'Portfolio must be a slot number')
    .max(9, 'Portfolio must be a slot number');

export const makePaginationQuery = ({ defaultLimit = 24, maxLimit = 100 } = {}): PaginationQuerySchema =>
    z.object({
        page: z.coerce.number('page must be a positive integer').int().min(1, 'page must be a positive integer').default(1),
        limit: z.coerce
            .number(`limit must be 1–${maxLimit}`)
            .int()
            .min(1, `limit must be 1–${maxLimit}`)
            .max(maxLimit, `limit must be 1–${maxLimit}`)
            .default(defaultLimit),
    });

/** Default pagination: page 1, limit 24, cap 100. */
export const paginationQuery = makePaginationQuery();

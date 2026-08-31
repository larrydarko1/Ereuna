/**
 * Request validation middleware (Zod).
 * `validated({ body, params, query }, handler)` returns the middleware pair to
 * spread into a route. It `safeParse`s each part, aggregates every failure into
 * one 422 response, and only calls the handler with clean, coerced data — so
 * handlers never re-check their own input and routes stay `validate → service →
 * respond`.
 * The handler receives a request typed from the schemas, so `req.body.shares`
 * is a `number` at compile time rather than an `any` that has to be parsed
 * again. Parsed query lands on `req.validatedQuery` because Express 5's
 * `req.query` is a read-only getter.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import type { AuthRequest } from '@/middleware/auth.js';

type Schemas = {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
};

/** Output type of a schema slot, or `TFallback` when that slot is unset. */
type Out<TSlot, TFallback> = TSlot extends ZodType<infer TOutput> ? TOutput : TFallback;

type ValidatedRequest<TSchemas extends Schemas> = Omit<AuthRequest, 'body' | 'params' | 'validatedQuery'> & {
    body: Out<TSchemas['body'], unknown>;
    params: Out<TSchemas['params'], Record<string, string>>;
    validatedQuery: Out<TSchemas['query'], unknown>;
};

type ValidatedHandler<TSchemas extends Schemas> = (
    req: ValidatedRequest<TSchemas>,
    res: Response,
    next: NextFunction,
) => void | Promise<void>;

export function validated<const TSchemas extends Schemas>(
    schemas: TSchemas,
    handler: ValidatedHandler<TSchemas>,
): RequestHandler[] {
    return [
        validate(schemas),
        (req, res, next): void => {
            void Promise.resolve(handler(req as unknown as ValidatedRequest<TSchemas>, res, next)).catch(next);
        },
    ];
}

function validate(schemas: Schemas): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const errors: { field: string; message: string }[] = [];
        const collect = (result: { success: false; error: ZodError } | { success: true }): void => {
            if (!result.success) {
                errors.push(
                    ...result.error.issues.map((issue) => ({
                        field: issue.path.join('.') === '' ? '(root)' : issue.path.join('.'),
                        message: issue.message,
                    })),
                );
            }
        };

        if (schemas.body !== undefined) {
            const result = schemas.body.safeParse(req.body);
            collect(result);
            if (result.success) req.body = result.data;
        }

        if (schemas.params !== undefined) {
            const result = schemas.params.safeParse(req.params);
            collect(result);
            if (result.success) Object.assign(req.params, result.data);
        }

        if (schemas.query !== undefined) {
            const result = schemas.query.safeParse(req.query);
            collect(result);
            if (result.success) req.validatedQuery = result.data;
        }

        if (errors.length > 0) {
            // The multi-error shape ({ error, errors[] }) is wider than AppError
            // can carry; this middleware is the canonical validation responder.
            res.status(422).json({ error: 'VALIDATION_FAILED', errors });
            return;
        }

        next();
    };
}

declare global {
    namespace Express {
        interface Request {
            validatedQuery?: unknown; // Parsed + coerced query params (Express 5's req.query is read-only).
        }
    }
}

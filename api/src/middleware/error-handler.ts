/**
 * Global Express error handler — the one place errors become HTTP responses.
 * Registered LAST, after every route: Express identifies it by its four-argument
 * signature, and mounting it before the routers means errors never reach it.
 * What it catches:
 *   AppError — the intentional path. `code` (+ params) goes on the wire; the
 *     English `message` is logged and never sent. `logContext` is merged into
 *     the boundary log line so the event is logged exactly once, and a throw
 *     flagged `securityEvent` additionally gets ip and user-agent.
 *   ZodError — a safety net for a stray `parse()` outside the validate
 *     middleware, answered in the same shape validate uses.
 *   a body the parser refused — malformed JSON, or over the size cap — answered
 *     with the parser's own 4xx as MALFORMED_REQUEST / REQUEST_TOO_LARGE. The
 *     client's mistake, not ours: as a 500 it would page someone and blame the
 *     server.
 *   anything else — a bug, not an expected failure: logged in full, answered
 *     with a bare INTERNAL.
 * What never happens here: English on the wire, stack traces on the wire, user
 * input echoed back, or an error silently swallowed.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@/lib/app-error.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        // logContext is spread FIRST so the canonical fields and client context
        // always win — a stray logContext `ip` cannot shadow the real req.ip.
        const security = err.securityEvent ? securityContext(req) : undefined;
        if (err.status >= 500) {
            req.log.error({ ...err.logContext, err, code: err.code, ...security }, err.message);
        } else {
            req.log.warn({ ...err.logContext, code: err.code, status: err.status, ...security }, err.message);
        }
        res.status(err.status).json({ error: err.code, ...(err.params !== undefined ? { params: err.params } : {}) });
        return;
    }

    if (err instanceof ZodError) {
        req.log.warn({ issues: err.issues.length, method: req.method, url: req.url }, 'Unhandled ZodError');
        res.status(422).json({
            error: 'VALIDATION_FAILED',
            errors: err.issues.map((issue) => ({
                field: issue.path.join('.') === '' ? '(root)' : issue.path.join('.'),
                message: issue.message,
            })),
        });
        return;
    }

    if (isRefusedBody(err)) {
        req.log.warn({ status: err.status, type: err.type, method: req.method, url: req.url }, 'Request body refused');
        res.status(err.status).json({ error: err.status === 413 ? 'REQUEST_TOO_LARGE' : 'MALFORMED_REQUEST' });
        return;
    }

    req.log.error({ err, method: req.method, url: req.url }, 'Unhandled error');
    res.status(500).json({ error: 'INTERNAL' });
}

/**
 * An error body-parser raised for the request itself. It follows the http-errors
 * convention: a 4xx `status`, `expose: true` (safe to tell the client) and a
 * `type` such as `entity.parse.failed` or `entity.too.large`.
 */
function isRefusedBody(err: unknown): err is Error & { status: number; type: unknown } {
    if (!(err instanceof Error) || !('status' in err) || !('expose' in err)) return false;
    return typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.expose === true;
}

/** Client context attached to security-event logs only — ip and user-agent are PII. */
function securityContext(req: Request): { ip: string | undefined; userAgent: string | undefined } {
    return { ip: req.ip, userAgent: req.get('user-agent') };
}

/**
 * Request ID middleware — one correlation id per request, for log tracing.
 * Accepts an inbound `x-request-id` only when it is a well-formed UUID, and
 * generates one otherwise. The format check is not pedantry: an unvalidated
 * header goes straight into every log line for that request, so a value
 * carrying newlines lets a caller forge log entries.
 * Binds `req.log` to a child logger with the id attached, which is what lets
 * the error handler log once with full correlation.
 */
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { logger } from '@/lib/logger.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requestId(req: Request, res: Response, next: NextFunction): void {
    const supplied = req.headers['x-request-id'];
    const candidate = typeof supplied === 'string' ? supplied.trim() : '';

    let id: string;
    if (candidate === '') {
        id = randomUUID();
    } else if (isValidRequestId(candidate)) {
        id = candidate;
    } else {
        logger.warn(
            {
                ip: req.ip,
                invalidId: candidate.slice(0, 100),
                userAgent: req.get('user-agent'),
                method: req.method,
                url: req.url,
            },
            'Invalid x-request-id header — generating a replacement',
        );
        id = randomUUID();
    }

    req.id = id;
    res.setHeader('x-request-id', id);
    req.log = logger.child({ requestId: id });

    next();
}

function isValidRequestId(id: string): boolean {
    return id.length === 36 && !id.includes('\n') && !id.includes('\r') && UUID_PATTERN.test(id);
}

declare global {
    namespace Express {
        interface Request {
            id: string; // Correlation id, propagated from x-request-id or generated.
            log: Logger; // Request-scoped logger with `requestId` bound.
        }
    }
}

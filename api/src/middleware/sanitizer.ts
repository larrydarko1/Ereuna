/**
 * NoSQL injection sanitizer middleware.
 * A key that starts with `$` is a Mongo operator, a dotted key is a Mongo path,
 * and `__proto__`, `constructor` and `prototype` are prototype pollution. No
 * request schema declares any of them, so a request carrying one is a probe, not
 * a client that meant something else: it is refused, as a security event, before
 * any route reads it. Stripping it and answering 2xx would tell the prober the
 * request went through, and is what the strict validator exists to stop.
 * What does go through is still the stripped copy, so a route that reads its
 * input without a schema can never meet one of these keys either.
 */
import type { NextFunction, Request, Response } from 'express';

import { droppedKeys, isRecord } from '@ereuna/shared';

import { AppError } from '@/lib/app-error.js';

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
    const sent: unknown = req.body;
    const body = stripUnsafeKeys(req.body);
    const query = stripUnsafeKeys(req.query);
    const refused = [...droppedKeys(sent, body), ...droppedKeys(req.query, query)];
    if (refused.length > 0) {
        next(
            new AppError(422, 'VALIDATION_FAILED', 'Request carried an operator, path or prototype key', {
                logContext: { op: 'request.sanitize', refused: refused.join(', ') },
                securityEvent: true,
            }),
        );
        return;
    }
    req.body = body;
    // Express 5's `req.query` is a getter that re-parses the query string on
    // every read, so the object one middleware mutates is not the object the
    // route handler receives. Shadowing the getter with an own property is
    // what makes the strip stick — mutating in place is silently discarded.
    Object.defineProperty(req, 'query', { value: query, configurable: true, enumerable: true, writable: false });
    next();
}

function stripUnsafeKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripUnsafeKeys);
    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !isUnsafeKey(key))
                .map(([key, val]) => [key, stripUnsafeKeys(val)]),
        );
    }
    return value;
}

function isUnsafeKey(key: string): boolean {
    return key.startsWith('$') || key.includes('.') || POLLUTION_KEYS.has(key);
}

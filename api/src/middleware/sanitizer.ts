/** NoSQL injection sanitizer middleware. */
import type { NextFunction, Request, Response } from 'express';

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
    if (typeof req.body === 'object' && req.body !== null) {
        req.body = stripUnsafeKeys(req.body);
    }
    if (typeof req.query === 'object' && req.query !== null) {
        // Express 5's `req.query` is a getter that re-parses the query string on
        // every read, so the object one middleware mutates is not the object the
        // route handler receives. Shadowing the getter with an own property is
        // what makes the strip stick — mutating in place is silently discarded.
        Object.defineProperty(req, 'query', {
            value: stripUnsafeKeys(req.query),
            configurable: true,
            enumerable: true,
            writable: false,
        });
    }
    next();
}

function stripUnsafeKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripUnsafeKeys);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([key]) => !isUnsafeKey(key))
                .map(([key, val]) => [key, stripUnsafeKeys(val)]),
        );
    }
    return value;
}

function isUnsafeKey(key: string): boolean {
    return key.startsWith('$') || key.includes('.') || POLLUTION_KEYS.has(key);
}

/** NoSQL injection sanitizer middleware. */
import type { NextFunction, Request, Response } from 'express';

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
    if (typeof req.body === 'object' && req.body !== null) {
        req.body = stripUnsafeKeys(req.body);
    }
    if (typeof req.query === 'object' && req.query !== null) {
        stripUnsafeKeysInPlace(req.query);
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

/** Mutate in place — needed for `req.query`, which is a read-only getter in Express 5. */
function stripUnsafeKeysInPlace(obj: Record<string, unknown>): void {
    for (const key of Object.keys(obj)) {
        if (isUnsafeKey(key)) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the keys being stripped are attacker-supplied by definition, so they cannot be static
            delete obj[key];
        } else {
            const child = obj[key];
            if (child !== null && typeof child === 'object') {
                stripUnsafeKeysInPlace(child as Record<string, unknown>);
            }
        }
    }
}

function isUnsafeKey(key: string): boolean {
    return key.startsWith('$') || key.includes('.') || POLLUTION_KEYS.has(key);
}

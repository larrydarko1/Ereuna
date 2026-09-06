import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/app-error.js';

describe('AppError', () => {
    it('is a real Error, so it narrows and carries a stack', () => {
        const err = new AppError(404, 'NOT_FOUND', 'nothing here');
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('AppError');
        expect(err.stack).toBeDefined();
    });

    it('keeps the English message server-side and the code on the wire', () => {
        const err = new AppError(404, 'SCREENER_NOT_FOUND', 'screener "growth" not found');
        expect(err.status).toBe(404);
        expect(err.code).toBe('SCREENER_NOT_FOUND');
        expect(err.message).toBe('screener "growth" not found');
    });

    it('carries interpolation params for codes whose translation has placeholders', () => {
        const err = new AppError(400, 'FILTER_RANGE_INVALID', 'bad range', { params: { min: 1, max: 100 } });
        expect(err.params).toEqual({ min: 1, max: 100 });
    });

    it('carries structured log context the boundary merges into one line', () => {
        const err = new AppError(401, 'INVALID_TOKEN', 'bad token', { logContext: { op: 'auth.token' } });
        expect(err.logContext).toEqual({ op: 'auth.token' });
    });

    it('is not a security event unless it says so — most 401s are routine', () => {
        expect(new AppError(401, 'MISSING_TOKEN', 'no token').securityEvent).toBe(false);
        expect(new AppError(401, 'MISSING_TOKEN', 'no token', { securityEvent: true }).securityEvent).toBe(true);
    });

    it('leaves the optional fields undefined rather than inventing empties', () => {
        const err = new AppError(500, 'INTERNAL', 'boom');
        expect(err.params).toBeUndefined();
        expect(err.logContext).toBeUndefined();
    });
});

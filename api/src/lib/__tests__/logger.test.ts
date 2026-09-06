import { describe, expect, it } from 'vitest';
import { logger } from '@/lib/logger.js';
import { config } from '@/lib/config.js';

describe('the API logger', () => {
    it('names every line `api`, so its output is separable from the worker output', () => {
        expect(logger.bindings().name).toBe('api');
    });

    it('runs at the configured level', () => {
        expect(logger.level).toBe(config.logger.level);
    });

    it('makes a request-scoped child, which is what `requestId` binds', () => {
        const child = logger.child({ requestId: 'abc' });
        expect(child.bindings()).toMatchObject({ name: 'api', requestId: 'abc' });
    });
});

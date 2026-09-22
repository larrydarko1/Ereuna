import { describe, expect, it } from 'vitest';

import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

describe('the worker logger', () => {
    it("names every line `aggregator`, so its output is separable from the API's", () => {
        expect(logger.bindings()['name']).toBe('aggregator');
    });

    it('runs at the configured level', () => {
        expect(logger.level).toBe(config.logger.level);
    });
});

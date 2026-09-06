import { describe, expect, it } from 'vitest';
import { logger } from '@/lib/logger.js';
import { config } from '@/lib/config.js';

describe('the ingestor logger', () => {
    it("names every line `ingestor`, so its output is separable from the worker's", () => {
        expect(logger.bindings().name).toBe('ingestor');
    });

    it('runs at the configured level', () => {
        expect(logger.level).toBe(config.logger.level);
    });
});

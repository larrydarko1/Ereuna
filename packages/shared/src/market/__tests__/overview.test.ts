import { describe, expect, it } from 'vitest';
import { BREADTH_UNIVERSES, OUTLOOK_TERMS } from '#market/overview.js';

describe('BREADTH_UNIVERSES', () => {
    it('starts with `all`, which is every asset', () => {
        expect(BREADTH_UNIVERSES[0]).toBe('all');
    });

    it('names each universe once', () => {
        expect(new Set(BREADTH_UNIVERSES).size).toBe(BREADTH_UNIVERSES.length);
    });
});

describe('OUTLOOK_TERMS', () => {
    it('is the three horizons, shortest first', () => {
        expect(OUTLOOK_TERMS).toEqual(['short', 'mid', 'long']);
    });
});

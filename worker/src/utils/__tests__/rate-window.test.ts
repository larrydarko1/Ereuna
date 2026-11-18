import { describe, expect, it } from 'vitest';

import { msUntilNextSlot } from '@/utils/rate-window.js';

const HOUR = 3_600_000;
const NOW = 10 * HOUR;

describe('msUntilNextSlot', () => {
    it('lets a request through while the window holds fewer than the limit', () => {
        expect(msUntilNextSlot([NOW - 2_000, NOW - 1_000], NOW, 3, HOUR)).toBe(0);
    });

    it('holds a request at the limit until the oldest in the window ages out', () => {
        expect(msUntilNextSlot([NOW - 600_000, NOW - 1_000, NOW - 500], NOW, 3, HOUR)).toBe(HOUR - 600_000);
    });

    it('ignores sends older than the window', () => {
        expect(msUntilNextSlot([NOW - 2 * HOUR, NOW - HOUR, NOW - 1_000], NOW, 2, HOUR)).toBe(0);
    });

    it('waits for the one that leaves the window first, not the oldest ever sent, when over the limit', () => {
        const sent = [NOW - 900_000, NOW - 600_000, NOW - 300_000];
        expect(msUntilNextSlot(sent, NOW, 2, HOUR)).toBe(HOUR - 600_000);
    });
});

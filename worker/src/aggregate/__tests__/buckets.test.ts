import { describe, expect, it } from 'vitest';
import { bucketEnd, bucketStart } from '@/aggregate/buckets.js';

const at = (iso: string): number => Date.parse(iso);
const iso = (ms: number): string => new Date(ms).toISOString();

describe('bucketStart', () => {
    it('floors an intraday timestamp to its own bucket', () => {
        expect(iso(bucketStart('1m', at('2026-09-03T14:37:41.812Z')))).toBe('2026-09-03T14:37:00.000Z');
        expect(iso(bucketStart('5m', at('2026-09-03T14:37:41.812Z')))).toBe('2026-09-03T14:35:00.000Z');
        expect(iso(bucketStart('15m', at('2026-09-03T14:37:41.812Z')))).toBe('2026-09-03T14:30:00.000Z');
        expect(iso(bucketStart('30m', at('2026-09-03T14:37:41.812Z')))).toBe('2026-09-03T14:30:00.000Z');
        expect(iso(bucketStart('1hr', at('2026-09-03T14:37:41.812Z')))).toBe('2026-09-03T14:00:00.000Z');
    });

    it('is idempotent on a boundary', () => {
        const boundary = at('2026-09-03T14:30:00.000Z');
        expect(bucketStart('30m', boundary)).toBe(boundary);
    });

    it('floors a daily timestamp to UTC midnight', () => {
        expect(iso(bucketStart('1d', at('2026-09-03T20:59:59.999Z')))).toBe('2026-09-03T00:00:00.000Z');
    });

    it('floors a weekly timestamp to Monday', () => {
        // 2026-09-03 is a Thursday; its week opens on Monday the 31st of August.
        expect(iso(bucketStart('1w', at('2026-09-03T14:37:00Z')))).toBe('2026-08-31T00:00:00.000Z');
    });

    it('keeps a Monday in its own week rather than the previous one', () => {
        expect(iso(bucketStart('1w', at('2026-08-31T00:00:00Z')))).toBe('2026-08-31T00:00:00.000Z');
        expect(iso(bucketStart('1w', at('2026-08-30T23:59:59Z')))).toBe('2026-08-24T00:00:00.000Z');
    });
});

describe('bucketEnd', () => {
    it('is the start of the next bucket', () => {
        expect(iso(bucketEnd('5m', at('2026-09-03T14:37:41Z')))).toBe('2026-09-03T14:40:00.000Z');
        expect(iso(bucketEnd('1d', at('2026-09-03T14:37:41Z')))).toBe('2026-09-04T00:00:00.000Z');
        expect(iso(bucketEnd('1w', at('2026-09-03T14:37:41Z')))).toBe('2026-09-07T00:00:00.000Z');
    });
});

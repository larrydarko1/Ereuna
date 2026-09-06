import { describe, expect, it } from 'vitest';
import type { Time } from '@/lib/lightweight-charts';
import type { ChartBar, ChartPoint } from '@/composables/charts/useChartSeries';
import { closes, heikinAshi, relativeVolume } from '@/utils/candles';

const bar = (over: Partial<ChartBar> = {}): ChartBar => ({
    time: '2026-03-02' as Time,
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    ...over,
});

const point = (value: number, time = '2026-03-02'): ChartPoint => ({ time: time as Time, value });

describe('heikinAshi', () => {
    it('averages each close over the four prices', () => {
        const [first] = heikinAshi([bar()]);

        expect(first?.close).toBe((10 + 12 + 9 + 11) / 4);
    });

    it('seeds the first open from the real bar, which has no predecessor', () => {
        const [first] = heikinAshi([bar()]);

        expect(first?.open).toBe((10 + 11) / 2);
    });

    it('takes each later open from the midpoint of the previous averaged bar', () => {
        const [first, second] = heikinAshi([bar(), bar({ open: 11, high: 14, low: 10, close: 13 })]);

        expect(second?.open).toBe(((first?.open ?? 0) + (first?.close ?? 0)) / 2);
    });

    it('stretches the wicks to cover the averaged body', () => {
        const [only] = heikinAshi([bar({ open: 10, high: 10.2, low: 10.1, close: 10.15 })]);

        expect(only?.high).toBeGreaterThanOrEqual(only?.open ?? 0);
        expect(only?.low).toBeLessThanOrEqual(only?.close ?? 0);
    });

    it('keeps each bar at its own time', () => {
        const result = heikinAshi([bar(), bar({ time: '2026-03-03' as Time })]);

        expect(result.map((entry) => entry.time)).toEqual(['2026-03-02', '2026-03-03']);
    });

    it('answers with nothing for an empty series', () => {
        expect(heikinAshi([])).toEqual([]);
    });
});

describe('closes', () => {
    it('keeps the time and drops everything but the close', () => {
        expect(closes([bar()])).toEqual([{ time: '2026-03-02', value: 11 }]);
    });
});

describe('relativeVolume', () => {
    const options = { window: 3, normal: 'grey', heavy: 'accent' };

    it('marks a bar trading more than twice its trailing average', () => {
        const result = relativeVolume([point(100), point(100), point(100), point(1000)], options);

        expect(result[3]?.color).toBe('accent');
    });

    it('leaves an ordinary bar the muted colour', () => {
        const result = relativeVolume([point(100), point(100), point(110)], options);

        expect(result.every((entry) => entry.color === 'grey')).toBe(true);
    });

    it('compares an early bar against what there is, not against nothing', () => {
        const result = relativeVolume([point(100)], options);

        expect(result[0]?.color).toBe('grey');
    });

    it('drops the oldest bar out of the window once it is full', () => {
        const series = [point(1000), point(100), point(100), point(100), point(500)];

        // The last bar is heavy only because the 1,000 has left the window; the
        // same series over a wider window still has it in the average.
        expect(relativeVolume(series, options)[4]?.color).toBe('accent');
        expect(relativeVolume(series, { ...options, window: 5 })[4]?.color).toBe('grey');
    });

    it('leaves a zero-volume run muted rather than dividing by nothing', () => {
        const result = relativeVolume([point(0), point(0)], options);

        expect(result.every((entry) => entry.color === 'grey')).toBe(true);
    });

    it('keeps the original point on the way through', () => {
        const result = relativeVolume([point(100)], options);

        expect(result[0]).toMatchObject({ time: '2026-03-02', value: 100 });
    });
});

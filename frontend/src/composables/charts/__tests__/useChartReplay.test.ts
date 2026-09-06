import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type Ref } from 'vue';
import type { Time } from '@/lib/lightweight-charts';
import type { ChartBar, ChartPoint, OverlaySeries } from '@/composables/charts/useChartSeries';
import { useChartReplay, type UseChartReplayReturn } from '@/composables/charts/useChartReplay';

const DAYS = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'];

const bar = (time: string, close: number): ChartBar => ({
    time: time as Time,
    open: close,
    high: close,
    low: close,
    close,
});

function build(days = DAYS): {
    replay: UseChartReplayReturn;
    bars: Ref<ChartBar[]>;
    stop: () => void;
} {
    const bars = ref<ChartBar[]>(days.map((day, index) => bar(day, 10 + index)));
    const volume = ref<ChartPoint[]>(days.map((day) => ({ time: day as Time, value: 100 })));
    const overlays = ref<OverlaySeries[]>([
        { type: 'SMA', period: 10, points: days.map((day) => ({ time: day as Time, value: 9 })) },
    ]);
    const scope = effectScope();
    const replay = scope.run(() => useChartReplay(bars, volume, overlays)) as UseChartReplayReturn;
    return { replay, bars, stop: () => scope.stop() };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('before it starts', () => {
    it('shows the whole series', () => {
        const { replay } = build();

        expect(replay.active.value).toBe(false);
        expect(replay.visibleBars.value).toHaveLength(5);
        expect(replay.visibleVolume.value).toHaveLength(5);
        expect(replay.visibleOverlays.value[0]?.points).toHaveLength(5);
    });

    it('offers the first and last day as the range that can be replayed', () => {
        const { replay } = build();

        expect(replay.bounds.value).toEqual({ min: '2026-03-02', max: '2026-03-06' });
    });

    it('has empty bounds and no label when there are no bars', () => {
        const { replay } = build([]);

        expect(replay.bounds.value).toEqual({ min: '', max: '' });
        expect(replay.label.value).toBe('');
        expect(replay.progress.value).toBe(0);
    });

    it('refuses to start on an empty series', () => {
        const { replay } = build([]);

        replay.start(new Date('2026-03-02'));

        expect(replay.active.value).toBe(false);
    });
});

describe('cutting the series', () => {
    it('stops the bars, the volume and each overlay at the same instant', () => {
        const { replay } = build();

        replay.start(new Date('2026-03-03T00:00:00Z'));

        expect(replay.visibleBars.value.map((one) => one.time)).toEqual(['2026-03-02', '2026-03-03']);
        expect(replay.visibleVolume.value).toHaveLength(2);
        expect(replay.visibleOverlays.value[0]?.points).toHaveLength(2);
    });

    it('walks forward one bar at a time', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-03T00:00:00Z'));

        replay.step(1);

        expect(replay.visibleBars.value).toHaveLength(3);
    });

    it('walks back', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));
        replay.step(1);
        replay.step(1);

        replay.step(-1);

        expect(replay.visibleBars.value).toHaveLength(2);
    });

    it('will not rewind past the bar the replay began on', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-04T00:00:00Z'));

        replay.step(-1);

        expect(replay.visibleBars.value).toHaveLength(3);
    });

    it('seeks by percentage of the range that is left', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));

        replay.seek(100);

        expect(replay.visibleBars.value).toHaveLength(5);
        expect(replay.progress.value).toBe(100);
    });

    it('reports how far through it is', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));
        expect(replay.progress.value).toBe(0);

        replay.step(1);

        expect(replay.progress.value).toBe(25);
    });

    it('reports no progress when there is nothing left to replay', () => {
        const { replay } = build();

        replay.start(new Date('2026-03-06T00:00:00Z'));

        expect(replay.progress.value).toBe(0);
    });

    it("names the day at the right edge in the user's locale", () => {
        const { replay } = build();

        replay.start(new Date('2026-03-03T00:00:00Z'));

        expect(replay.label.value).toBe('Mar 3, 2026');
    });
});

describe('playing', () => {
    it('advances on its own once started', async () => {
        const { replay } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));

        replay.toggle();
        expect(replay.playing.value).toBe(true);

        await vi.advanceTimersByTimeAsync(1000);
        await nextTick();

        expect(replay.visibleBars.value.length).toBeGreaterThan(1);
    });

    it('pauses', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));

        replay.toggle();
        replay.toggle();

        expect(replay.playing.value).toBe(false);
    });

    it('takes a new speed while it is running', async () => {
        const { replay } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));
        replay.toggle();

        replay.speed.value = 4;
        await nextTick();
        await vi.advanceTimersByTimeAsync(1000);

        expect(replay.visibleBars.value.length).toBeGreaterThan(2);
    });
});

describe('leaving', () => {
    it('puts the whole series back', () => {
        const { replay } = build();
        replay.start(new Date('2026-03-03T00:00:00Z'));

        replay.exit();

        expect(replay.active.value).toBe(false);
        expect(replay.playing.value).toBe(false);
        expect(replay.visibleBars.value).toHaveLength(5);
    });

    it('leaves on its own when the bars are renumbered under it', async () => {
        const { replay, bars } = build();
        replay.start(new Date('2026-03-03T00:00:00Z'));

        bars.value = [bar('2026-02-27', 9), ...bars.value];
        await nextTick();

        expect(replay.active.value).toBe(false);
    });

    it('stops its timer when the component goes away', () => {
        const { replay, stop } = build();
        replay.start(new Date('2026-03-02T00:00:00Z'));
        replay.toggle();

        stop();

        expect(vi.getTimerCount()).toBe(0);
    });
});

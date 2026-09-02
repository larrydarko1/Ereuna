/**
 * useChartReplay — walking a loaded series forward one bar at a time.
 * Replay is a view of the bars already held, not a second dataset: everything
 * it shows is `bars` cut at an index. The chart this replaces kept twelve
 * parallel arrays for it — a "full" and a "normal" copy of the bars, the
 * volume and each of the four averages — and re-derived the cut inside four
 * separate computed properties that compared timestamps by hand.
 * The transport (the interval, the seek, the bounds) is `ReplayManager`; this
 * puts its position into a ref and cuts the series to match.
 */
import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';
import { ReplayManager } from '@/lib/lightweight-charts/replay-manager';
import type { ChartBar, ChartPoint, OverlaySeries } from '@/composables/charts/useChartSeries';
import { i18n } from '@/i18n';
import { timeToDate, timeValue } from '@/utils/chartTime';

export type UseChartReplayReturn = {
    active: Readonly<Ref<boolean>>;
    playing: Readonly<Ref<boolean>>;
    progress: ComputedRef<number>; // How far through the replay range, 0–100, for the scrubber.
    label: ComputedRef<string>; // The date of the bar currently at the right edge, in the user's locale.
    speed: Ref<number>;
    bounds: ComputedRef<{ min: string; max: string }>; // The earliest and latest dates that can be replayed from, as `YYYY-MM-DD`
    start: (from: Date) => void;
    exit: () => void;
    toggle: () => void;
    step: (delta: 1 | -1) => void;
    seek: (percent: number) => void;
    visibleBars: ComputedRef<readonly ChartBar[]>;
    visibleVolume: ComputedRef<readonly ChartPoint[]>;
    visibleOverlays: ComputedRef<readonly OverlaySeries[]>;
};

const DATE_LABEL: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

export function useChartReplay(
    bars: Readonly<Ref<readonly ChartBar[]>>,
    volume: Readonly<Ref<readonly ChartPoint[]>>,
    overlays: Readonly<Ref<readonly OverlaySeries[]>>,
): UseChartReplayReturn {
    const manager = new ReplayManager([]);
    const active = ref(false);
    const playing = ref(false);
    const index = ref(0);
    const startIndex = ref(0);
    const speed = ref(1);

    const unsubscribe = manager.onChange((current) => {
        index.value = current;
        playing.value = manager.getState().isPlaying;
    });

    onScopeDispose(() => {
        unsubscribe();
        manager.destroy();
    });

    // Replay is a session over one series. A different symbol, a different
    // timeframe, or an older page scrolled into view all renumber the bars, so
    // an index carried across would put an unrelated bar at the edge.
    watch(bars, () => {
        if (active.value) exit();
    });

    watch(speed, (next) => {
        manager.setSpeed(next);
    });

    /** The instant the replay is stopped at, or null when it is not running. */
    const cutoff = computed<number | null>(() => {
        if (!active.value) return null;
        const bar = bars.value[index.value];
        return bar === undefined ? null : timeValue(bar.time);
    });

    const visibleBars = computed(() => (active.value ? bars.value.slice(0, index.value + 1) : bars.value));
    const visibleVolume = computed(() => cut(volume.value, cutoff.value));
    const visibleOverlays = computed(() => {
        const at = cutoff.value;
        if (at === null) return overlays.value;
        return overlays.value.map((series) => ({ ...series, points: [...cut(series.points, at)] }));
    });

    const progress = computed(() => {
        const range = bars.value.length - 1 - startIndex.value;
        if (!active.value || range <= 0) return 0;
        return ((index.value - startIndex.value) / range) * 100;
    });

    const label = computed(() => {
        const bar = bars.value[index.value];
        if (!active.value || bar === undefined) return '';
        const date = timeToDate(bar.time);
        return date === null ? '' : date.toLocaleDateString(i18n.global.locale.value, DATE_LABEL);
    });

    const bounds = computed(() => ({
        min: isoDay(bars.value[0]),
        max: isoDay(bars.value[bars.value.length - 1]),
    }));

    function start(from: Date): void {
        if (bars.value.length === 0) return;
        manager.setFullData([...bars.value]);
        manager.setSpeed(speed.value);
        manager.startReplayFromDate(from);
        index.value = manager.getState().currentIndex;
        startIndex.value = index.value;
        active.value = true;
    }

    function exit(): void {
        manager.exitReplay();
        active.value = false;
        playing.value = false;
        startIndex.value = 0;
    }

    function toggle(): void {
        manager.togglePlayPause();
        playing.value = manager.getState().isPlaying;
    }

    function step(delta: 1 | -1): void {
        if (delta === 1) manager.stepForward();
        else manager.stepBackward();
    }

    function seek(percent: number): void {
        manager.seekByProgress(percent);
    }

    return {
        active,
        playing,
        progress,
        label,
        speed,
        bounds,
        start,
        exit,
        toggle,
        step,
        seek,
        visibleBars,
        visibleVolume,
        visibleOverlays,
    };
}

function cut<T extends { time: ChartBar['time'] }>(points: readonly T[], cutoff: number | null): readonly T[] {
    if (cutoff === null) return points;
    return points.filter((point) => timeValue(point.time) <= cutoff);
}

function isoDay(bar: ChartBar | undefined): string {
    if (bar === undefined) return '';
    const date = timeToDate(bar.time);
    return date === null ? '' : date.toISOString().slice(0, 10);
}

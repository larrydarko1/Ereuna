/**
 * useChartDrawings — annotations saved against one (symbol, timeframe) chart.
 * Drawings are per chart, not per user: a trendline drawn on the daily has no
 * meaning on the five-minute, so switching either axis saves what is on screen
 * and loads what belongs to the new pair.
 */
import { onScopeDispose, ref, type Ref } from 'vue';
import type { ChartDrawings, ChartTimeframe } from '@ereuna/shared';
import type { BoxManager } from '@/lib/lightweight-charts/box';
import type { FreehandManager } from '@/lib/lightweight-charts/freehand';
import type { PriceLevelManager } from '@/lib/lightweight-charts/price-level';
import type { TextAnnotationManager } from '@/lib/lightweight-charts/text-annotation';
import type { TrendLineManager } from '@/lib/lightweight-charts/trendline';
import { clearDrawings, getDrawings, saveDrawings } from '@/api/chart';

export type UseChartDrawingsReturn = {
    hasDrawings: Ref<boolean>; //  True while the chart holds at least one annotation, so "clear all" can hide itself
    attach: (managers: DrawingManagers) => void; // Adopt a set of managers. Called once the series they attach to exists.
    snapshot: () => ChartDrawings | null; // What is on the canvas right now, for carrying across a series rebuild.
    restore: (drawings: ChartDrawings) => void; // Put a snapshot back without a read, and without counting as an edit.
    load: (key: ChartKey) => Promise<void>;
    save: (key: ChartKey) => Promise<void>; // Persist what is on screen for `key`. Safe to call when nothing has changed.
    touch: (key: ChartKey) => void; // Queue a save; repeated edits during a drag collapse into one request.
    clear: (key: ChartKey) => Promise<void>;
    reset: () => void; // Wipe the canvas without touching what is stored — used when switching charts.
};

type DrawingManagers = {
    trendLines: TrendLineManager;
    boxes: BoxManager;
    textAnnotations: TextAnnotationManager;
    freehandPaths: FreehandManager;
    priceLevels: PriceLevelManager;
};

type ChartKey = {
    symbol: string;
    timeframe: ChartTimeframe;
};

/**
 * How long a burst of edits is allowed to settle before it is written.
 * Dragging one endpoint of a trendline fires a change per frame; the old
 * persistence layer answered that with a fixed 30-second interval timer, so a
 * drawing made and navigated away from within half a minute was simply lost.
 */
const SETTLE_MS = 1500;

const EMPTY: ChartDrawings = {
    trendLines: [],
    boxes: [],
    textAnnotations: [],
    freehandPaths: [],
    priceLevels: [],
};

export function useChartDrawings(): UseChartDrawingsReturn {
    const hasDrawings = ref(false);
    let managers: DrawingManagers | null = null;

    // Suppressed while `load` is populating the managers: every shape it adds
    // announces itself as a change, and writing those back would be the read
    // echoed straight into a write.
    let loading = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let queued: ChartKey | null = null;

    onScopeDispose(() => {
        if (timer !== undefined) clearTimeout(timer);
    });

    function attach(next: DrawingManagers): void {
        managers = next;
        hasDrawings.value = !isEmpty(collect(next));
    }

    function collect(source: DrawingManagers): ChartDrawings {
        return {
            trendLines: source.trendLines.getTrendLines(),
            boxes: source.boxes.getBoxes(),
            textAnnotations: source.textAnnotations.getAnnotations(),
            freehandPaths: source.freehandPaths.getPaths(),
            priceLevels: source.priceLevels.serialize(),
        };
    }

    function snapshot(): ChartDrawings | null {
        return managers === null ? null : collect(managers);
    }

    function restore(drawings: ChartDrawings): void {
        loading = true;
        apply(drawings);
        loading = false;
        hasDrawings.value = !isEmpty(drawings);
    }

    async function load(key: ChartKey): Promise<void> {
        if (managers === null || key.symbol === '') return;
        loading = true;
        try {
            const { data } = await getDrawings(key.symbol, key.timeframe);
            apply(data);
            hasDrawings.value = !isEmpty(data);
        } catch {
            // A chart that will not load its annotations still draws prices.
            // Leaving the canvas clean is the honest failure: showing the
            // previous symbol's trendlines over this one would be worse.
            apply(EMPTY);
            hasDrawings.value = false;
        } finally {
            loading = false;
        }
    }

    function apply(drawings: ChartDrawings): void {
        if (managers === null) return;
        managers.trendLines.loadTrendLines(drawings.trendLines as Parameters<TrendLineManager['loadTrendLines']>[0]);
        managers.boxes.loadBoxes(drawings.boxes as Parameters<BoxManager['loadBoxes']>[0]);
        managers.textAnnotations.loadAnnotations(
            drawings.textAnnotations as Parameters<TextAnnotationManager['loadAnnotations']>[0],
        );
        managers.freehandPaths.loadPaths(drawings.freehandPaths as Parameters<FreehandManager['loadPaths']>[0]);
        managers.priceLevels.deserialize(drawings.priceLevels as Parameters<PriceLevelManager['deserialize']>[0]);
    }

    async function save(key: ChartKey): Promise<void> {
        if (managers === null || loading || key.symbol === '') return;
        cancelPending();

        const drawings = collect(managers);
        hasDrawings.value = !isEmpty(drawings);
        try {
            await saveDrawings(key.symbol, key.timeframe, drawings);
        } catch {
            // The drawing is still on screen and will be written by the next
            // edit or the next chart switch; a failed save is not worth
            // interrupting someone mid-annotation over.
        }
    }

    function touch(key: ChartKey): void {
        if (loading) return;
        queued = key;
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            const target = queued;
            queued = null;
            if (target !== null) void save(target);
        }, SETTLE_MS);
    }

    async function clear(key: ChartKey): Promise<void> {
        cancelPending();
        reset();
        if (key.symbol === '') return;
        try {
            await clearDrawings(key.symbol, key.timeframe);
        } catch {
            // Same reasoning as `save`: the canvas is already clear, and the
            // next write for this chart replaces the stored document anyway.
        }
    }

    function reset(): void {
        if (managers === null) return;
        loading = true;
        apply(EMPTY);
        loading = false;
        hasDrawings.value = false;
    }

    function cancelPending(): void {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        queued = null;
    }

    return { hasDrawings, attach, snapshot, restore, load, save, touch, clear, reset };
}

function isEmpty(drawings: ChartDrawings): boolean {
    return Object.values(drawings).every((items) => items.length === 0);
}

/** useChartSeries — the bars, volume and overlays behind one chart. */
import { onScopeDispose, readonly, ref, watch, type Ref } from 'vue';
import type { ChartTimeframe } from '@ereuna/shared';
import { isIntraday } from '@ereuna/shared';
import type { Time } from '@/lib/lightweight-charts';
import { getSeries, type Candle, type ChartOverlay } from '@/api/chart';
import { apiErrorMessage } from '@/api/client';
import { i18n } from '@/i18n';
import { timeKey, timeValue } from '@/utils/chartTime';

export type ChartBar = {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
};

export type ChartPoint = {
    time: Time;
    value: number;
};

export type OverlaySeries = {
    type: ChartOverlay['type'];
    period: number;
    points: ChartPoint[];
};

export type ChartSeriesKey = {
    symbol: string;
    timeframe: ChartTimeframe;
    /**
     * The overlays the API is being asked to compute, as a stable signature.
     * The averages are a stored preference the server reads for itself, so
     * nothing is sent with the request — but editing them has to re-ask for the
     * series, and without them in the key a new moving average only appeared
     * after a symbol or timeframe change.
     */
    overlays: string;
};

export type UseChartSeriesReturn = {
    bars: Readonly<Ref<readonly ChartBar[]>>;
    volume: Readonly<Ref<readonly ChartPoint[]>>;
    overlays: Readonly<Ref<readonly OverlaySeries[]>>;
    pending: Readonly<Ref<boolean>>;
    error: Readonly<Ref<string | null>>;
    exhausted: Readonly<Ref<boolean>>; // True once a page comes back empty: there is nothing older to ask for.
    loadOlder: () => Promise<void>;
    reload: () => Promise<void>;
    applyLive: (candle: LiveBar) => void; // Fold the in-progress candle into the series
};

/** One candle from the live feed, in the API's time format. */
type LiveBar = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export function useChartSeries(key: () => ChartSeriesKey): UseChartSeriesReturn {
    const bars = ref<ChartBar[]>([]);
    const volume = ref<ChartPoint[]>([]);
    const overlays = ref<OverlaySeries[]>([]);
    const pending = ref(false);
    const error = ref<string | null>(null);
    const exhausted = ref(false);

    let cursor: string | null = null;
    let paging = false;

    // Bumped on every request and on every reset. A response whose sequence is
    // no longer current belongs to a symbol the user has already left.
    let sequence = 0;
    onScopeDispose(() => {
        sequence += 1;
    });

    async function load(): Promise<void> {
        const { symbol, timeframe } = key();
        const ticket = (sequence += 1);

        reset();
        if (symbol === '') return;

        pending.value = true;
        try {
            const { data } = await getSeries(symbol, { timeframe });
            if (ticket !== sequence) return;

            bars.value = data.candles.map((candle) => toBar(candle, timeframe));
            volume.value = data.volume.map((point) => ({ time: toTime(point.time, timeframe), value: point.value }));
            overlays.value = data.overlays.map((overlay) => toOverlay(overlay, timeframe));
            cursor = data.candles[0]?.time ?? null;
            exhausted.value = data.candles.length === 0;
            error.value = null;
        } catch (cause) {
            if (ticket !== sequence) return;
            error.value = apiErrorMessage(cause, i18n.global.t('errors.INTERNAL'));
        } finally {
            if (ticket === sequence) pending.value = false;
        }
    }

    /**
     * Prepend the page before the oldest bar held.
     * Overlays are not extended: the API computes each average over the window
     * it was asked for, so an older page's averages are the same function of
     * the same prices and simply continue the line leftwards.
     */
    async function loadOlder(): Promise<void> {
        if (paging || exhausted.value || cursor === null) return;
        const { symbol, timeframe } = key();
        if (symbol === '') return;

        const ticket = sequence;
        paging = true;
        try {
            const { data } = await getSeries(symbol, { timeframe, before: cursor });
            if (ticket !== sequence) return;

            if (data.candles.length === 0) {
                exhausted.value = true;
                return;
            }

            const known = new Set(bars.value.map((bar) => timeKey(bar.time)));
            const older = data.candles
                .map((candle) => toBar(candle, timeframe))
                .filter((bar) => !known.has(timeKey(bar.time)));

            const knownVolume = new Set(volume.value.map((point) => timeKey(point.time)));
            const olderVolume = data.volume
                .map((point) => ({ time: toTime(point.time, timeframe), value: point.value }))
                .filter((point) => !knownVolume.has(timeKey(point.time)));

            bars.value = [...older, ...bars.value];
            volume.value = [...olderVolume, ...volume.value];
            overlays.value = mergeOverlays(overlays.value, data.overlays, timeframe);
            cursor = data.candles[0]?.time ?? cursor;
        } catch {
            // Scrolling further left than the data goes is not an error worth
            // showing: the chart already has bars on it and keeps them.
        } finally {
            paging = false;
        }
    }

    function reset(): void {
        bars.value = [];
        volume.value = [];
        overlays.value = [];
        error.value = null;
        exhausted.value = false;
        cursor = null;
    }

    function applyLive(candle: LiveBar): void {
        const { symbol, timeframe } = key();
        if (symbol === '' || bars.value.length === 0) return;

        const time = toTime(candle.time, timeframe);
        const last = bars.value[bars.value.length - 1];
        if (last === undefined) return;

        const incoming = timeValue(time);
        const current = timeValue(last.time);
        if (incoming < current) return;

        const bar: ChartBar = {
            time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        };
        const point: ChartPoint = { time, value: candle.volume };

        if (incoming === current) {
            bars.value = [...bars.value.slice(0, -1), bar];
            volume.value = [...volume.value.slice(0, -1), point];
            return;
        }

        bars.value = [...bars.value, bar];
        volume.value = [...volume.value, point];
    }

    // Watched as one flat string rather than as the object: `key` builds a new
    // object on every read, so a watcher on it re-fetched — and `load` blanks
    // the chart first — whenever anything it touches changed, including a
    // preference that has nothing to do with the series.
    watch(
        () => {
            const { symbol, timeframe, overlays } = key();
            return `${symbol}|${timeframe}|${overlays}`;
        },
        load,
        { immediate: true },
    );

    return {
        bars: readonly(bars),
        volume: readonly(volume),
        overlays: readonly(overlays) as Readonly<Ref<readonly OverlaySeries[]>>,
        pending: readonly(pending),
        error: readonly(error),
        exhausted: readonly(exhausted),
        loadOlder,
        reload: load,
        applyLive,
    };
}

function toBar(candle: Candle, timeframe: ChartTimeframe): ChartBar {
    return {
        time: toTime(candle.time, timeframe),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
    };
}

function toOverlay(overlay: ChartOverlay, timeframe: ChartTimeframe): OverlaySeries {
    return {
        type: overlay.type,
        period: overlay.period,
        points: overlay.points.map((point) => ({ time: toTime(point.time, timeframe), value: point.value })),
    };
}

/** Merge an older page's overlay points in front of the ones already plotted. */
function mergeOverlays(
    current: readonly OverlaySeries[],
    incoming: readonly ChartOverlay[],
    timeframe: ChartTimeframe,
): OverlaySeries[] {
    return current.map((series) => {
        const match = incoming.find((overlay) => overlay.type === series.type && overlay.period === series.period);
        if (match === undefined) return series;

        const known = new Set(series.points.map((point) => timeKey(point.time)));
        const older = match.points
            .map((point) => ({ time: toTime(point.time, timeframe), value: point.value }))
            .filter((point) => !known.has(timeKey(point.time)));

        return { ...series, points: [...older, ...series.points] };
    });
}

/**
 * The renderer's time for one API timestamp.
 * Daily and weekly bars are business days and pass through as `YYYY-MM-DD`.
 * Intraday bars arrive as `YYYY-MM-DDTHH:mm:ss` with the trailing `Z` trimmed
 * off, and a date-time with no offset is parsed as *local* time — so reading it
 * with a bare `new Date(...)` shifted every intraday bar by the viewer's offset
 * from UTC, which is what the previous chart did. The `Z` goes back on.
 */
function toTime(raw: string, timeframe: ChartTimeframe): Time {
    if (!isIntraday(timeframe)) return raw;
    const parsed = Date.parse(raw.endsWith('Z') ? raw : `${raw}Z`);
    return (Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000)) as Time;
}

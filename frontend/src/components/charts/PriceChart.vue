<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ChartTimeframe } from '@ereuna/shared';
import { CHART_TIMEFRAMES, isIntraday } from '@ereuna/shared';
import {
    BoxManager,
    ChartRuler,
    ChartScreenshot,
    ColorType,
    CrosshairMode,
    FreehandManager,
    TextAnnotationManager,
    TrendLineManager,
    createChart,
    type IChartApi,
    type IPriceLine,
    type ISeriesApi,
    type LogicalRange,
    type MouseEventParams,
    type SeriesMarker,
    type SeriesType,
    type Time,
} from '@/lib/lightweight-charts';
import { detectAllPatterns, type PatternMatch } from '@/lib/lightweight-charts/pattern-detection';
import { PriceLevelManager } from '@/lib/lightweight-charts/price-level';
import { PatternOverlayManager } from '@/lib/lightweight-charts/pattern-overlay';
import type { ScreenshotConfig } from '@/lib/lightweight-charts/screenshot';
import type { AssetProfile, ChartEvents } from '@/api/chart';
import ChartLegend from '@/components/charts/ChartLegend.vue';
import ChartReplayBar from '@/components/charts/ChartReplayBar.vue';
import ChartSettingsDialog from '@/components/charts/ChartSettingsDialog.vue';
import ChartToolbar from '@/components/charts/ChartToolbar.vue';
import PatternsDialog from '@/components/charts/PatternsDialog.vue';
import ReplayStartDialog from '@/components/charts/ReplayStartDialog.vue';
import ScreenshotDialog from '@/components/charts/ScreenshotDialog.vue';
import SignalsDialog from '@/components/charts/SignalsDialog.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import { useChartDrawings } from '@/composables/charts/useChartDrawings';
import { useChartReplay } from '@/composables/charts/useChartReplay';
import { useChartSeries, type ChartBar } from '@/composables/charts/useChartSeries';
import { useChartSettings } from '@/composables/charts/useChartSettings';
import { useChartTheme, withAlpha } from '@/composables/charts/useChartTheme';
import { useMarketStatus } from '@/composables/charts/useMarketStatus';
import { usePreferences } from '@/composables/data/usePreferences';
import { useNotifications } from '@/composables/ui/useNotifications';
import {
    EOD_TIMEFRAMES,
    MIN_PATTERN_BARS,
    PREFETCH_BARS,
    TIMEFRAME_LABELS,
    VOLUME_WINDOW,
    type ChartQuote,
    type ChartTool,
    type OverlayLabel,
} from '@/constants/chart';
import { closes, heikinAshi, relativeVolume } from '@/utils/candles';
import { timeToIsoDate } from '@/utils/chartTime';

const { symbol, profile = null, events = null } = defineProps<{
    symbol: string;
    profile?: AssetProfile | null;
    events?: ChartEvents | null;
}>();

const { t } = useI18n();
const { notify } = useNotifications();
const { palette } = useChartTheme();
const { settings } = useChartSettings();
const { preferences } = usePreferences();

const timeframe = ref<ChartTimeframe>('daily');
const series = useChartSeries(() => ({ symbol, timeframe: timeframe.value }));
const replay = useChartReplay(series.bars, series.volume, series.overlays);
const drawings = useChartDrawings();
const market = useMarketStatus(() => profile?.exchange === 'CRYPTO');

const container = useTemplateRef<HTMLElement>('container');

/** The screenshot manager finds the canvas layers by the container's id. */
const CANVAS_ID = 'price-chart-canvas';

const tool = ref<ChartTool | null>(null);
const crosshairIndex = ref<number | null>(null);
const detectedPatterns = ref<PatternMatch[]>([]);
const patternsShown = ref(false);
const dialog = ref<'settings' | 'patterns' | 'signals' | 'screenshot' | 'replay' | 'clear' | null>(null);

/**
 * Chart objects are not reactive state — Vue would deeply proxy a canvas
 * renderer's internals, and every mutation would go through a proxy trap.
 */
let chart: IChartApi | null = null;
let mainSeries: ISeriesApi<SeriesType> | null = null;
let volumeSeries: ISeriesApi<'Histogram'> | null = null;
let overlaySeries: ISeriesApi<'Line'>[] = [];
let intrinsicLine: IPriceLine | null = null;
let resizeObserver: ResizeObserver | null = null;
let screenshotManager: ChartScreenshot | null = null;
let patternOverlay: PatternOverlayManager | null = null;
let ruler: ChartRuler | null = null;
let trendLines: TrendLineManager | null = null;
let boxes: BoxManager | null = null;
let annotations: TextAnnotationManager | null = null;
let freehand: FreehandManager | null = null;
let priceLevels: PriceLevelManager | null = null;

/** The chart the drawing layer is currently saving to. */
const drawingKey = computed(() => ({ symbol, timeframe: timeframe.value }));

/** Line, area and baseline draw one value per bar; the rest draw a body. */
const priceOnly = computed(() => ['line', 'area', 'baseline'].includes(settings.value.style));

const shapedBars = computed<readonly ChartBar[]>(() =>
    settings.value.style === 'heikinAshi' ? heikinAshi(replay.visibleBars.value) : replay.visibleBars.value,
);

const overlayLabels = computed<OverlayLabel[]>(() =>
    series.overlays.value.map((overlay, index) => ({
        label: `${overlay.type} ${overlay.period}`,
        color: palette.value.overlays[index] ?? palette.value.textMuted,
    })),
);

/**
 * The bar the crosshair is over, or the newest one when it is off the chart.
 * The change is against the bar before it, which is why a series of one bar
 * has no quote: there is nothing to have changed from.
 */
const quote = computed<ChartQuote | null>(() => {
    const bars = shapedBars.value;
    if (bars.length < 2) return null;

    const index = crosshairIndex.value ?? bars.length - 1;
    const current = bars[index];
    const previous = bars[index - 1];
    if (current === undefined || previous === undefined) return null;

    const change = current.close - previous.close;
    return {
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close,
        change,
        changePercent: previous.close === 0 ? 0 : (change / previous.close) * 100,
    };
});

const badges = computed(() => {
    const flags: string[] = [];
    if (profile?.delisted === true) flags.push(t('charts.delisted'));
    // Hidden is a screener setting, shown here because looking at the chart is
    // exactly when someone wonders why this symbol never comes up in a scan.
    if (preferences.value?.hiddenSymbols.includes(symbol) === true) flags.push(t('charts.hidden'));
    if (isEodOnly.value) flags.push(t('charts.eodOnly'));
    return flags;
});

/**
 * True when the ingestor only carries end-of-day bars for this listing.
 * Intraday collections cover the two US exchanges; anything else has a daily
 * bar at best, so offering a five-minute timeframe would return an empty chart.
 */
const isEodOnly = computed(() => {
    const exchange = profile?.exchange;
    return exchange !== null && exchange !== undefined && exchange !== 'NASDAQ' && exchange !== 'NYSE';
});

const timeframes = computed(() => (isEodOnly.value ? EOD_TIMEFRAMES : CHART_TIMEFRAMES));

// Lifecycle

onMounted(() => {
    const element = container.value;
    if (element === null) return;

    chart = createChart(element, chartOptions());
    volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        lastValueVisible: false,
        priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });

    screenshotManager = new ChartScreenshot(chart, CANVAS_ID);

    buildMainSeries();
    syncOverlays();
    resize();

    chart.subscribeCrosshairMove(onCrosshair);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    resizeObserver = new ResizeObserver(() => {
        resize();
        priceLevels?.updatePositions();
    });
    resizeObserver.observe(element);

    window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    resizeObserver?.disconnect();

    // Last chance to persist: a pending debounce would fire into a component
    // that no longer exists, so the queued save is taken now instead.
    void drawings.save(drawingKey.value);

    destroyManagers();
    patternOverlay = null;
    screenshotManager = null;
    chart?.remove();
    chart = null;
});

// Series

function chartOptions(): Parameters<IChartApi['applyOptions']>[0] {
    const colors = palette.value;
    return {
        layout: { background: { type: ColorType.Solid, color: colors.background }, textColor: colors.text },
        grid: { vertLines: { color: 'transparent' }, horzLines: { color: 'transparent' } },
        crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: colors.border, labelBackgroundColor: colors.border },
            horzLine: { color: colors.border, labelBackgroundColor: colors.border },
        },
        timeScale: { barSpacing: 3, minBarSpacing: 0.1, rightOffset: 20, timeVisible: true, secondsVisible: false },
    };
}

/**
 * Create the main series for the current style and hand it to every manager.
 * The drawing tools hold a reference to the series they measure against, so a
 * style change is not just a redraw: each one has to be pointed at the new
 * series or its coordinates come from a series the chart has dropped.
 */
function buildMainSeries(): void {
    if (chart === null) return;
    if (mainSeries !== null) {
        chart.removeSeries(mainSeries);
        intrinsicLine = null;
    }

    const colors = palette.value;
    const body = {
        upColor: colors.positive,
        downColor: colors.negative,
        borderUpColor: colors.positive,
        borderDownColor: colors.negative,
        wickUpColor: colors.positive,
        wickDownColor: colors.negative,
    };

    switch (settings.value.style) {
        case 'bar':
            mainSeries = chart.addBarSeries({ upColor: colors.positive, downColor: colors.negative });
            break;
        case 'line':
            mainSeries = chart.addLineSeries({ color: colors.accent, lineWidth: 2 });
            break;
        case 'area':
            mainSeries = chart.addAreaSeries({
                lineColor: colors.accent,
                topColor: withAlpha(colors.accent, 0.5),
                bottomColor: withAlpha(colors.accent, 0.05),
                lineWidth: 2,
            });
            break;
        case 'baseline':
            mainSeries = chart.addBaselineSeries({
                baseValue: { type: 'price', price: averageClose() },
                topLineColor: colors.positive,
                topFillColor1: withAlpha(colors.positive, 0.25),
                topFillColor2: withAlpha(colors.positive, 0.05),
                bottomLineColor: colors.negative,
                bottomFillColor1: withAlpha(colors.negative, 0.05),
                bottomFillColor2: withAlpha(colors.negative, 0.25),
                lineWidth: 2,
            });
            break;
        default:
            mainSeries = chart.addCandlestickSeries(body);
    }

    applyBars();
    applyIntrinsicLine();
    rebuildManagers();
}

function applyBars(): void {
    if (mainSeries === null) return;
    const bars = shapedBars.value;
    mainSeries.setData(priceOnly.value ? [...closes(bars)] : [...bars]);
    applyMarkers();

    // Price levels are absolutely-positioned DOM, not canvas: they only know
    // where to sit once the series they are priced against has been drawn.
    void nextTick(() => priceLevels?.updatePositions());
}

function applyVolume(): void {
    if (volumeSeries === null) return;
    volumeSeries.setData(
        relativeVolume(replay.visibleVolume.value, {
            window: VOLUME_WINDOW,
            normal: palette.value.volume,
            heavy: palette.value.accent,
        }),
    );
}

/** One line series per overlay the API returned, created and dropped to match. */
function syncOverlays(): void {
    if (chart === null) return;
    const wanted = series.overlays.value;

    while (overlaySeries.length > wanted.length) {
        const extra = overlaySeries.pop();
        if (extra !== undefined) chart.removeSeries(extra);
    }
    while (overlaySeries.length < wanted.length) {
        overlaySeries.push(
            chart.addLineSeries({ lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false }),
        );
    }

    replay.visibleOverlays.value.forEach((overlay, index) => {
        const line = overlaySeries[index];
        if (line === undefined) return;
        line.applyOptions({ color: palette.value.overlays[index] ?? palette.value.textMuted });
        line.setData([...overlay.points]);
    });
}

function averageClose(): number {
    const bars = series.bars.value;
    if (bars.length === 0) return 0;
    return bars.reduce((total, bar) => total + bar.close, 0) / bars.length;
}

/**
 * The intrinsic-value line, when the user asked for one and the asset has one.
 * The API only sends the value when the setting is on, so an absent value here
 * means either answer and both draw nothing.
 */
function applyIntrinsicLine(): void {
    if (mainSeries === null) return;
    if (intrinsicLine !== null) {
        mainSeries.removePriceLine(intrinsicLine);
        intrinsicLine = null;
    }

    const value = series.intrinsicValue.value;
    if (value === null) return;

    intrinsicLine = mainSeries.createPriceLine({
        price: value,
        color: palette.value.border,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: t('charts.intrinsicValueShort'),
    });
}

// Markers

/**
 * Corporate actions on the time axis.
 * Markers are attached to the volume series rather than to the price series so
 * a style change does not drop them, and anything dated before the listing is
 * discarded — the reference data carries dividend histories that predate an
 * asset's own IPO, and a marker with no bar under it renders at the left edge.
 */
function applyMarkers(): void {
    if (volumeSeries === null) return;

    // Corporate actions are dated to a day. An intraday series is keyed to the
    // second, so there is no bar for "2024-03-15" to attach a marker to, and
    // asking for one places nothing. Day-level markers belong on day-level bars.
    if (isIntraday(timeframe.value)) {
        volumeSeries.setMarkers([]);
        return;
    }

    const { earnings, dividends, splits } = settings.value.markers;
    const listed = profile?.ipo ?? null;
    const colors = palette.value;
    const markers: SeriesMarker<Time>[] = [];

    const add = (date: string | undefined, color: string, text: string): void => {
        const day = date?.slice(0, 10);
        if (day === undefined || day === '' || (listed !== null && day < listed)) return;
        markers.push({
            time: day as Time,
            position: 'aboveBar',
            shape: 'circle',
            size: 1,
            color,
            text,
            id: `${text}-${day}`,
            // `originalTime` is how the renderer maps a marker back to the bar
            // it was given; for a business day that is the same string.
            originalTime: day,
        });
    };

    if (earnings) for (const date of events?.earnings ?? []) add(date, colors.accent, 'E');
    if (dividends) for (const action of events?.dividends ?? []) add(action.payment_date ?? action.date, colors.dividend, 'D');
    if (splits) for (const action of events?.splits ?? []) add(action.date ?? action.payment_date, colors.split, 'S');

    markers.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    volumeSeries.setMarkers(markers);
}

// Drawing tools

/**
 * Point the drawing tools at the series that exists now.
 * Every manager holds the series it converts coordinates against, so replacing
 * the main series means replacing all six. What is on the canvas is carried
 * across rather than re-read: a rebuild is a style change, not a chart change,
 * and a pending save that has not fired yet would otherwise be lost to the
 * stale copy the API still holds.
 */
function rebuildManagers(): void {
    if (chart === null || mainSeries === null || container.value === null) return;

    const carried = drawings.snapshot();
    destroyManagers();

    ruler = new ChartRuler(chart, mainSeries);
    trendLines = new TrendLineManager(chart, mainSeries);
    boxes = new BoxManager(chart, mainSeries);
    annotations = new TextAnnotationManager(chart, mainSeries);
    freehand = new FreehandManager(chart, mainSeries);
    priceLevels = new PriceLevelManager(chart, mainSeries, container.value);

    for (const manager of [trendLines, boxes, annotations, freehand, priceLevels]) {
        manager.onChange(() => drawings.touch(drawingKey.value));
    }

    drawings.attach({
        trendLines,
        boxes,
        textAnnotations: annotations,
        freehandPaths: freehand,
        priceLevels,
    });

    applyTool();
    if (carried === null) void drawings.load(drawingKey.value);
    else drawings.restore(carried);
}

function destroyManagers(): void {
    for (const manager of [ruler, trendLines, boxes, annotations, freehand, priceLevels]) manager?.destroy();
    ruler = null;
    trendLines = null;
    boxes = null;
    annotations = null;
    freehand = null;
    priceLevels = null;
}

/** Exactly one tool is live at a time, so every switch deactivates the rest. */
function applyTool(): void {
    const active = tool.value;
    if (ruler?.isRulerActive() === true && active !== 'ruler') ruler.deactivate();
    if (trendLines?.isToolActive() === true && active !== 'trendline') trendLines.deactivate();
    if (boxes?.isToolActive() === true && active !== 'box') boxes.deactivate();
    if (annotations?.isToolActive() === true && active !== 'text') annotations.deactivate();
    if (freehand?.isToolActive() === true && active !== 'freehand') freehand.deactivate();
    if (priceLevels?.isActivated() === true && active !== 'priceLevel') priceLevels.deactivate();

    if (active === 'ruler' && ruler?.isRulerActive() === false) ruler.activate();
    if (active === 'trendline' && trendLines?.isToolActive() === false) trendLines.activate();
    if (active === 'box' && boxes?.isToolActive() === false) boxes.activate();
    if (active === 'text' && annotations?.isToolActive() === false) annotations.activate();
    if (active === 'freehand' && freehand?.isToolActive() === false) freehand.activate();
    if (active === 'priceLevel' && priceLevels?.isActivated() === false) priceLevels.activate();
}

async function clearDrawings(): Promise<void> {
    dialog.value = null;
    await drawings.clear(drawingKey.value);
    clearPatterns();
}

// Patterns, screenshot, replay

function togglePatterns(): void {
    if (patternsShown.value) {
        clearPatterns();
        return;
    }
    if (chart === null || mainSeries === null) return;

    const bars = replay.visibleBars.value;
    if (bars.length < MIN_PATTERN_BARS) {
        notify(t('charts.patterns.tooFewBars', { count: MIN_PATTERN_BARS }), 'info');
        return;
    }

    detectedPatterns.value = detectAllPatterns(
        bars.map((bar) => ({
            time: new Date(`${timeToIsoDate(bar.time)}T00:00:00Z`).getTime() / 1000,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
        })),
    );

    patternOverlay ??= new PatternOverlayManager(chart, mainSeries as ConstructorParameters<typeof PatternOverlayManager>[1]);
    patternOverlay.displayPatterns(detectedPatterns.value);
    patternOverlay.finalize();
    patternsShown.value = true;
    dialog.value = 'patterns';
}

function clearPatterns(): void {
    patternOverlay?.clearPatterns();
    detectedPatterns.value = [];
    patternsShown.value = false;
}

function exportScreenshot(config: Partial<ScreenshotConfig>): void {
    dialog.value = null;
    void screenshotManager?.takeScreenshot(
        {
            symbol,
            name: profile?.name ?? '',
            timeframe: t(`charts.timeframes.${timeframe.value}`),
            price: quote.value === null ? '' : quote.value.close.toFixed(2),
            change: quote.value === null ? '' : quote.value.change.toFixed(2),
            changePercent: quote.value === null ? '' : `${quote.value.changePercent.toFixed(2)}%`,
            date: new Date().toLocaleDateString(),
        },
        config,
    );
}

function onReplayButton(): void {
    if (replay.active.value) replay.exit();
    else dialog.value = 'replay';
}

function startReplay(from: Date): void {
    dialog.value = null;
    replay.start(from);
}

// Chart events

function onCrosshair(param: MouseEventParams<Time>): void {
    if (param.time === undefined) {
        crosshairIndex.value = null;
        return;
    }
    const index = shapedBars.value.findIndex((bar) => bar.time === param.time);
    crosshairIndex.value = index === -1 ? null : index;
}

/**
 * Page in older bars as the left edge is approached.
 * Suspended during replay: prepending bars renumbers the series the replay is
 * indexed into, which would move the playhead to a different date mid-run.
 */
function onRangeChange(range: LogicalRange | null): void {
    if (range === null || replay.active.value) return;
    if (range.from < PREFETCH_BARS) void series.loadOlder();
}

function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        tool.value = null;
        return;
    }
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;

    // Only when a drawing tool has focus of the chart: Backspace inside a text
    // annotation's input is an edit, not a delete of the annotation.
    if (document.activeElement !== document.body) return;

    switch (tool.value) {
        case 'trendline':
            trendLines?.removeSelectedLine();
            break;
        case 'box':
            boxes?.removeSelectedBox();
            break;
        case 'text':
            annotations?.removeSelectedAnnotation();
            break;
        case 'freehand':
            freehand?.removeSelectedPath();
            break;
        case 'priceLevel':
            priceLevels?.removeSelectedLevel();
            break;
        default:
            break;
    }
}

function resize(): void {
    const element = container.value;
    if (element === null || chart === null) return;
    const rect = element.getBoundingClientRect();
    chart.applyOptions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
}

// Reactive wiring

watch(palette, () => {
    chart?.applyOptions(chartOptions());
    buildMainSeries();
    applyVolume();
    syncOverlays();
});

watch(() => settings.value.style, buildMainSeries);
watch(shapedBars, applyBars);
watch(replay.visibleVolume, applyVolume);
watch([() => series.overlays.value, replay.visibleOverlays], syncOverlays);
watch(series.intrinsicValue, applyIntrinsicLine);
watch([() => events, () => settings.value.markers, timeframe], applyMarkers, { deep: true });
watch(tool, applyTool);

// A different chart is a different set of annotations. What is on screen
// belongs to the chart being left, so it is written before the canvas is wiped.
watch(drawingKey, async (next, previous) => {
    await drawings.save(previous);
    drawings.reset();
    clearPatterns();
    if (replay.active.value) replay.exit();
    tool.value = null;
    await nextTick();
    await drawings.load(next);
    priceLevels?.updatePositions();
});

// An instrument with no intraday coverage cannot stay on an intraday
// timeframe: the request would come back empty and the chart would go blank.
watch(isEodOnly, (eodOnly) => {
    if (eodOnly && timeframe.value !== 'daily' && timeframe.value !== 'weekly') timeframe.value = 'daily';
});

</script>

<template>
    <section class="price-chart">
        <div class="price-chart__controls">
            <div class="price-chart__timeframes" role="group" :aria-label="t('charts.timeframeLabel')">
                <button
                    v-for="option in timeframes"
                    :key="option"
                    type="button"
                    class="price-chart__timeframe"
                    :class="{ 'price-chart__timeframe--active': timeframe === option }"
                    :aria-pressed="timeframe === option"
                    :title="t(`charts.timeframes.${option}`)"
                    @click="timeframe = option"
                >
                    {{ TIMEFRAME_LABELS[option] }}
                </button>
            </div>

            <ChartToolbar
                v-model="tool"
                :has-drawings="drawings.hasDrawings.value"
                :has-signals="(profile?.signals.length ?? 0) > 0"
                :patterns-shown="patternsShown"
                :replaying="replay.active.value"
                @patterns="togglePatterns"
                @signals="dialog = 'signals'"
                @screenshot="dialog = 'screenshot'"
                @clear="dialog = 'clear'"
                @settings="dialog = 'settings'"
                @replay="onReplayButton"
            />
        </div>

        <ChartLegend
            :quote="quote"
            :overlays="overlayLabels"
            :status="market.status.value"
            :holiday-name="market.holidayName.value"
            :status-pending="market.pending.value"
            :price-only="priceOnly"
            :badges="badges"
        />

        <div class="price-chart__frame">
            <div :id="CANVAS_ID" ref="container" class="price-chart__canvas"></div>

            <div v-if="series.pending.value" class="price-chart__overlay">
                <AppSpinner />
            </div>

            <p v-else-if="series.error.value !== null" class="price-chart__overlay" role="alert">
                {{ series.error.value }}
            </p>

            <p v-else-if="series.bars.value.length === 0" class="price-chart__overlay">
                {{ t('charts.noData') }}
            </p>
        </div>

        <ChartReplayBar
            v-if="replay.active.value"
            v-model:speed="replay.speed.value"
            :playing="replay.playing.value"
            :progress="replay.progress.value"
            :label="replay.label.value"
            @toggle="replay.toggle"
            @step="replay.step"
            @seek="replay.seek"
        />

        <ChartSettingsDialog v-if="dialog === 'settings'" @close="dialog = null" />

        <PatternsDialog
            v-else-if="dialog === 'patterns'"
            :symbol="symbol"
            :patterns="detectedPatterns"
            @close="dialog = null"
        />

        <SignalsDialog
            v-else-if="dialog === 'signals'"
            :symbol="symbol"
            :signals="profile?.signals ?? []"
            @close="dialog = null"
        />

        <ScreenshotDialog v-else-if="dialog === 'screenshot'" @close="dialog = null" @export="exportScreenshot" />

        <ReplayStartDialog
            v-else-if="dialog === 'replay'"
            :min="replay.bounds.value.min"
            :max="replay.bounds.value.max"
            @close="dialog = null"
            @start="startReplay"
        />

        <AppDialog v-else-if="dialog === 'clear'" :title="t('charts.tools.clear')" size="sm" @close="dialog = null">
            <p class="price-chart__confirm">{{ t('charts.clearDrawingsBody') }}</p>
            <template #footer>
                <button type="button" @click="dialog = null">{{ t('common.cancel') }}</button>
                <button type="button" class="price-chart__danger" @click="clearDrawings">
                    {{ t('common.delete') }}
                </button>
            </template>
        </AppDialog>
    </section>
</template>

<style lang="scss" scoped>
.price-chart {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: $space-2;
    min-height: 0;
}

.price-chart__controls {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    align-items: center;
    justify-content: space-between;
}

.price-chart__timeframes {
    display: flex;
    gap: $space-1;
}

.price-chart__timeframe {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}

.price-chart__timeframe--active {
    border-color: $color-accent-1;
    color: $color-accent-1;
}

.price-chart__frame {
    position: relative;
    flex: 1;
    min-height: 320px;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-bg;
    overflow: hidden;
}

.price-chart__canvas {
    width: 100%;
    height: 100%;
}

.price-chart__confirm {
    margin: 0;
    font-size: $font-size-sm;
}

.price-chart__danger {
    margin-left: auto;
    padding: $space-1 $space-4;
    border: none;
    border-radius: $radius-sm;
    background: $color-negative;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;
}

.price-chart__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    background: $color-bg;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CHART_TOOLS, type ChartTool } from '@/constants/chart';

const {
    hasDrawings = false,
    hasSignals = false,
    patternsShown = false,
    replaying = false,
} = defineProps<{
    hasDrawings?: boolean;
    hasSignals?: boolean;
    patternsShown?: boolean;
    replaying?: boolean;
}>();

const emit = defineEmits<{
    patterns: [];
    signals: [];
    screenshot: [];
    clear: [];
    settings: [];
    replay: [];
}>();

/** Null when the pointer is back to panning and zooming the chart. */
const tool = defineModel<ChartTool | null>({ required: true });

const { t } = useI18n();

function pick(next: ChartTool): void {
    tool.value = tool.value === next ? null : next;
}
</script>

<template>
    <div
        class="toolbar"
        role="toolbar"
        :aria-label="t('charts.tools.label')">
        <div class="toolbar__group">
            <button
                v-for="option in CHART_TOOLS"
                :key="option"
                type="button"
                class="toolbar__button"
                :class="{ 'toolbar__button--active': tool === option }"
                :aria-pressed="tool === option"
                :title="t(`charts.tools.${option}`)"
                :aria-label="t(`charts.tools.${option}`)"
                @click="pick(option)">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <template v-if="option === 'ruler'">
                        <path d="M3 15.5 15.5 3 21 8.5 8.5 21z" />
                        <path d="M7 11.5 9 13.5M10.5 8 12.5 10M14 4.5 16 6.5" />
                    </template>
                    <path
                        v-else-if="option === 'trendline'"
                        d="M4 20 20 4" />
                    <rect
                        v-else-if="option === 'box'"
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="1" />
                    <path
                        v-else-if="option === 'text'"
                        d="M4 7V4h16v3M9 20h6M12 4v16" />
                    <template v-else-if="option === 'freehand'">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                    </template>
                    <template v-else>
                        <line
                            x1="3"
                            y1="12"
                            x2="21"
                            y2="12" />
                        <circle
                            cx="3"
                            cy="12"
                            r="2"
                            fill="currentColor" />
                        <circle
                            cx="21"
                            cy="12"
                            r="2"
                            fill="currentColor" />
                    </template>
                </svg>
            </button>
        </div>

        <div class="toolbar__group">
            <button
                type="button"
                class="toolbar__button"
                :class="{ 'toolbar__button--active': patternsShown }"
                :aria-pressed="patternsShown"
                :title="t('charts.tools.patterns')"
                :aria-label="t('charts.tools.patterns')"
                @click="emit('patterns')">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            </button>

            <button
                v-if="hasSignals"
                type="button"
                class="toolbar__button"
                :title="t('charts.signals.title')"
                :aria-label="t('charts.signals.title')"
                @click="emit('signals')">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <path d="M13 3v7h8c0 3.87-3.13 7-7 7h-1v4M11 21v-7H3c0-3.87 3.13-7 7-7h1V3" />
                </svg>
            </button>

            <button
                type="button"
                class="toolbar__button"
                :title="t('charts.tools.screenshot')"
                :aria-label="t('charts.tools.screenshot')"
                @click="emit('screenshot')">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle
                        cx="12"
                        cy="13"
                        r="4" />
                </svg>
            </button>

            <button
                v-if="hasDrawings"
                type="button"
                class="toolbar__button"
                :title="t('charts.tools.clear')"
                :aria-label="t('charts.tools.clear')"
                @click="emit('clear')">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            </button>

            <button
                type="button"
                class="toolbar__button"
                :class="{ 'toolbar__button--active': replaying }"
                :aria-pressed="replaying"
                :title="replaying ? t('charts.replay.exit') : t('charts.replay.start')"
                :aria-label="replaying ? t('charts.replay.exit') : t('charts.replay.start')"
                @click="emit('replay')">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <template v-if="replaying">
                        <line
                            x1="18"
                            y1="6"
                            x2="6"
                            y2="18" />
                        <line
                            x1="6"
                            y1="6"
                            x2="18"
                            y2="18" />
                    </template>
                    <template v-else>
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </template>
                </svg>
            </button>

            <button
                type="button"
                class="toolbar__button"
                :title="t('charts.settings.title')"
                :aria-label="t('charts.settings.title')"
                @click="emit('settings')">
                <svg
                    class="toolbar__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <circle
                        cx="12"
                        cy="12"
                        r="3" />
                    <path
                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    justify-content: space-between;
    padding: $space-1;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
}

.toolbar__group {
    display: flex;
    gap: $space-1;
}

.toolbar__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: $border-width solid transparent;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover {
        color: $color-text;
        border-color: $color-elevated;
    }
}

.toolbar__button--active {
    border-color: $color-accent-1;
    color: $color-accent-1;
}

.toolbar__icon {
    width: 18px;
    height: 18px;
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import IconBox from '@/components/icons/IconBox.vue';
import IconCamera from '@/components/icons/IconCamera.vue';
import IconClose from '@/components/icons/IconClose.vue';
import IconFreehand from '@/components/icons/IconFreehand.vue';
import IconPatterns from '@/components/icons/IconPatterns.vue';
import IconPriceLevel from '@/components/icons/IconPriceLevel.vue';
import IconReplay from '@/components/icons/IconReplay.vue';
import IconRuler from '@/components/icons/IconRuler.vue';
import IconSettings from '@/components/icons/IconSettings.vue';
import IconSignals from '@/components/icons/IconSignals.vue';
import IconText from '@/components/icons/IconText.vue';
import IconTrash from '@/components/icons/IconTrash.vue';
import IconTrendline from '@/components/icons/IconTrendline.vue';
import { CHART_TOOLS, type ChartTool } from '@/constants/chart';

const { hasDrawings, hasSignals, patternsShown, replaying } = defineProps<{
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
                <IconRuler
                    v-if="option === 'ruler'"
                    class="toolbar__icon" />
                <IconTrendline
                    v-else-if="option === 'trendline'"
                    class="toolbar__icon" />
                <IconBox
                    v-else-if="option === 'box'"
                    class="toolbar__icon" />
                <IconText
                    v-else-if="option === 'text'"
                    class="toolbar__icon" />
                <IconFreehand
                    v-else-if="option === 'freehand'"
                    class="toolbar__icon" />
                <IconPriceLevel
                    v-else
                    class="toolbar__icon" />
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
                <IconPatterns class="toolbar__icon" />
            </button>

            <button
                v-if="hasSignals"
                type="button"
                class="toolbar__button"
                :title="t('charts.signals.title')"
                :aria-label="t('charts.signals.title')"
                @click="emit('signals')">
                <IconSignals class="toolbar__icon" />
            </button>

            <button
                type="button"
                class="toolbar__button"
                :title="t('charts.tools.screenshot')"
                :aria-label="t('charts.tools.screenshot')"
                @click="emit('screenshot')">
                <IconCamera class="toolbar__icon" />
            </button>

            <button
                v-if="hasDrawings"
                type="button"
                class="toolbar__button"
                :title="t('charts.tools.clear')"
                :aria-label="t('charts.tools.clear')"
                @click="emit('clear')">
                <IconTrash class="toolbar__icon" />
            </button>

            <button
                type="button"
                class="toolbar__button"
                :class="{ 'toolbar__button--active': replaying }"
                :aria-pressed="replaying"
                :title="replaying ? t('charts.replay.exit') : t('charts.replay.start')"
                :aria-label="replaying ? t('charts.replay.exit') : t('charts.replay.start')"
                @click="emit('replay')">
                <IconClose
                    v-if="replaying"
                    class="toolbar__icon" />
                <IconReplay
                    v-else
                    class="toolbar__icon" />
            </button>

            <button
                type="button"
                class="toolbar__button"
                :title="t('charts.settings.title')"
                :aria-label="t('charts.settings.title')"
                @click="emit('settings')">
                <IconSettings class="toolbar__icon" />
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

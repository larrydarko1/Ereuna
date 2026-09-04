<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CHART_STYLES, type ChartIndicator, type ChartSettings } from '@ereuna/shared';
import { apiErrorMessage } from '@/api/client';
import AppDialog from '@/components/ui/AppDialog.vue';
import { useChartTheme } from '@/composables/charts/useChartTheme';
import {
    DEFAULT_CHART_SETTINGS,
    MAX_INDICATOR_PERIOD,
    useChartSettings,
} from '@/composables/charts/useChartSettings';

const emit = defineEmits<{ close: [] }>();

const MARKERS = ['earnings', 'dividends', 'splits'] as const;
const OVERLAY_TYPES = ['SMA', 'EMA'] as const;

const { t } = useI18n();
const { settings, save } = useChartSettings();
const { palette } = useChartTheme();

// A working copy: nothing reaches the account until Save, so Escape is a real
// cancel rather than an undo of writes already made.
const draft = ref<ChartSettings>(clone(settings.value));
const saving = ref(false);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
        await save(draft.value);
        emit('close');
    } catch (err) {
        error.value = apiErrorMessage(err, t('charts.settings.saveFailed'));
    } finally {
        saving.value = false;
    }
}

function restoreDefaults(): void {
    draft.value = clone(DEFAULT_CHART_SETTINGS);
}

function clone(settings: ChartSettings): ChartSettings {
    return {
        ...settings,
        indicators: settings.indicators.map((indicator) => ({ ...indicator })),
        markers: { ...settings.markers },
    };
}

/**
 * The period input is bound with `.number`, so an empty field is the empty
 * string rather than a number. Reading it back as one keeps the draft typed
 * and lets the field be cleared mid-edit without writing NaN into it.
 */
function setPeriod(indicator: ChartIndicator, value: string): void {
    const parsed = Number.parseInt(value, 10);
    indicator.period = Number.isFinite(parsed) ? parsed : 1;
}
</script>

<template>
    <AppDialog :title="t('charts.settings.title')" size="md" @close="emit('close')">
        <form class="chart-settings" @submit.prevent="submit">
            <label class="chart-settings__row">
                <span class="chart-settings__label">{{ t('charts.settings.style') }}</span>
                <select v-model="draft.style" class="chart-settings__select">
                    <option v-for="style in CHART_STYLES" :key="style" :value="style">
                        {{ t(`charts.styles.${style}`) }}
                    </option>
                </select>
            </label>

            <fieldset class="chart-settings__group">
                <legend class="chart-settings__legend">{{ t('charts.settings.overlays') }}</legend>

                <div v-for="(indicator, index) in draft.indicators" :key="index" class="chart-settings__indicator">
                    <label class="chart-settings__toggle">
                        <input v-model="indicator.visible" type="checkbox" />
                        <span
                            class="chart-settings__swatch"
                            :style="{ background: palette.overlays[index] }"
                        ></span>
                        <span class="chart-settings__visually-hidden">
                            {{ t('charts.settings.showOverlay', { number: index + 1 }) }}
                        </span>
                    </label>

                    <select
                        v-model="indicator.type"
                        class="chart-settings__select"
                        :aria-label="t('charts.settings.overlayType', { number: index + 1 })"
                    >
                        <option v-for="type in OVERLAY_TYPES" :key="type" :value="type">{{ type }}</option>
                    </select>

                    <input
                        class="chart-settings__number"
                        type="number"
                        min="1"
                        :max="MAX_INDICATOR_PERIOD"
                        :value="indicator.period"
                        :aria-label="t('charts.settings.overlayPeriod', { number: index + 1 })"
                        @input="setPeriod(indicator, ($event.target as HTMLInputElement).value)"
                    />
                </div>
            </fieldset>

            <fieldset class="chart-settings__group">
                <legend class="chart-settings__legend">{{ t('charts.settings.markers') }}</legend>

                <label v-for="marker in MARKERS" :key="marker" class="chart-settings__check">
                    <input v-model="draft.markers[marker]" type="checkbox" />
                    <span>{{ t(`charts.settings.marker.${marker}`) }}</span>
                </label>

                <label class="chart-settings__check">
                    <input v-model="draft.intrinsicValue" type="checkbox" />
                    <span>{{ t('charts.settings.intrinsicValue') }}</span>
                </label>
            </fieldset>

            <p v-if="error !== null" class="chart-settings__error" role="alert">{{ error }}</p>
        </form>

        <template #footer>
            <button type="button" class="chart-settings__link" :disabled="saving" @click="restoreDefaults">
                {{ t('charts.settings.restoreDefaults') }}
            </button>
            <button type="button" class="chart-settings__save" :disabled="saving" @click="submit">
                {{ t('common.save') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.chart-settings {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.chart-settings__row {
    display: flex;
    align-items: center;
    gap: $space-2;
    justify-content: space-between;
}

.chart-settings__label {
    font-size: $font-size-sm;
}

.chart-settings__group {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    margin: 0;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
}

.chart-settings__legend {
    padding: 0 $space-1;
    color: $color-text-muted;
    font-size: $font-size-xs;
    text-transform: uppercase;
}

.chart-settings__indicator {
    display: grid;
    align-items: center;
    gap: $space-2;
    grid-template-columns: auto 1fr 6rem;
}

.chart-settings__toggle,
.chart-settings__check {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-size-sm;
    cursor: pointer;
}

.chart-settings__swatch {
    width: 12px;
    height: 12px;
    border-radius: $radius-sm;
}

.chart-settings__select,
.chart-settings__number {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: $font-size-sm;
}

.chart-settings__visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

.chart-settings__error {
    margin: 0;
    color: $color-negative;
    font-size: $font-size-sm;
}

.chart-settings__link {
    padding: 0;
    border: none;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover:not(:disabled) {
        color: $color-text;
    }
}

.chart-settings__save {
    margin-left: auto;
    padding: $space-1 $space-4;
    border: none;
    border-radius: $radius-sm;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ScreenshotConfig } from '@/lib/lightweight-charts/screenshot';
import AppDialog from '@/components/ui/AppDialog.vue';
import { useChartTheme } from '@/composables/charts/useChartTheme';

const emit = defineEmits<{
    close: [];
    export: [config: Partial<ScreenshotConfig>];
}>();

const { t } = useI18n();
const { palette } = useChartTheme();

const includeChartInfo = ref(true);
const includeLogo = ref(true);
const includeWatermark = ref(true);

function submit(): void {
    emit('export', {
        includeChartInfo: includeChartInfo.value,
        includeLogo: includeLogo.value,
        includeWatermark: includeWatermark.value,
        backgroundColor: palette.value.surface,
    });
}
</script>

<template>
    <AppDialog :title="t('charts.screenshot.title')" size="sm" @close="emit('close')">
        <div class="screenshot">
            <label class="screenshot__option">
                <input v-model="includeChartInfo" type="checkbox" />
                <span>
                    <span class="screenshot__name">{{ t('charts.screenshot.includeInfo') }}</span>
                    <span class="screenshot__hint">{{ t('charts.screenshot.includeInfoHint') }}</span>
                </span>
            </label>

            <label class="screenshot__option">
                <input v-model="includeLogo" type="checkbox" />
                <span>
                    <span class="screenshot__name">{{ t('charts.screenshot.includeLogo') }}</span>
                    <span class="screenshot__hint">{{ t('charts.screenshot.includeLogoHint') }}</span>
                </span>
            </label>

            <label class="screenshot__option">
                <input v-model="includeWatermark" type="checkbox" />
                <span>
                    <span class="screenshot__name">{{ t('charts.screenshot.includeWatermark') }}</span>
                    <span class="screenshot__hint">{{ t('charts.screenshot.includeWatermarkHint') }}</span>
                </span>
            </label>
        </div>

        <template #footer>
            <button type="button" class="screenshot__download" @click="submit">
                {{ t('charts.screenshot.download') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.screenshot {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.screenshot__option {
    display: flex;
    align-items: flex-start;
    gap: $space-2;
    cursor: pointer;
}

.screenshot__name {
    display: block;
    font-size: $font-size-sm;
}

.screenshot__hint {
    display: block;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.screenshot__download {
    margin-left: auto;
    padding: $space-1 $space-4;
    border: none;
    border-radius: $radius-sm;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;
}
</style>

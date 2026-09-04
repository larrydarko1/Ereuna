<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { OutlookReading } from '@ereuna/shared';
import { formatNumber } from '@/utils/formatters';

const { readings } = defineProps<{ readings: OutlookReading[] }>();

const { t } = useI18n();
</script>

<template>
    <ul class="outlook">
        <li
            v-for="reading in readings"
            :key="reading.term"
            class="outlook__item">
            <span class="outlook__term">{{ t(`dashboard.outlook.${reading.term}Term`) }}</span>
            <span
                class="outlook__verdict"
                :class="`outlook__verdict--${reading.verdict}`">
                {{ t(`dashboard.outlook.${reading.verdict}`) }}
            </span>
            <!-- The periods the verdict was taken from, so a reading can be argued with -->
            <span class="outlook__detail">
                {{ t('dashboard.outlook.assetsUp', { percent: formatNumber(reading.percentUp, 1) }) }}
                <span class="outlook__periods">{{ reading.periods.join(' · ') }}</span>
            </span>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
.outlook {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.outlook__item {
    display: grid;
    gap: 0.15em;
    padding: 0.5em 0.8em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.outlook__term {
    font-size: $font-size-xs;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.outlook__verdict {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
}

.outlook__verdict--bullish {
    color: $color-positive;
}

.outlook__verdict--bearish {
    color: $color-negative;
}

.outlook__verdict--neutral {
    color: $color-text-muted;
}

.outlook__detail {
    display: flex;
    gap: 0.5em;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.outlook__periods {
    font-family: $font-mono;
}
</style>

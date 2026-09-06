<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TierRow } from '@ereuna/shared';
import { formatRatio } from '@/utils/formatters';

const { rows, count = 5 } = defineProps<{
    rows: TierRow[];
    count?: number; // How many to show from each end
}>();

const { t } = useI18n();

/**
 * The list arrives unsorted and is read from both ends, so it is ordered once
 * here. A universe smaller than 2×count would otherwise show the same row in
 * both columns, so the halves are cut from the sorted array rather than sliced
 * independently.
 */
const sorted = computed(() => [...rows].sort((left, right) => right.averageReturn - left.averageReturn));

const strongest = computed(() => sorted.value.slice(0, Math.min(count, Math.floor(sorted.value.length / 2))));

const weakest = computed(() =>
    strongest.value.length === 0 ? [] : sorted.value.slice(-strongest.value.length).reverse(),
);
</script>

<template>
    <div class="tier">
        <!-- Strongest and weakest are cut from one sorted list, never overlapping -->
        <section class="tier__column">
            <h3 class="tier__title">{{ t('dashboard.sectors.strongest') }}</h3>
            <ol class="tier__list">
                <li
                    v-for="row in strongest"
                    :key="row.name"
                    class="tier__row">
                    <span class="tier__name">{{ row.name }}</span>
                    <span class="tier__count">{{ row.count }}</span>
                    <span class="tier__return tier__return--positive">{{ formatRatio(row.averageReturn) }}</span>
                </li>
            </ol>
        </section>

        <section class="tier__column">
            <h3 class="tier__title">{{ t('dashboard.sectors.weakest') }}</h3>
            <ol class="tier__list">
                <li
                    v-for="row in weakest"
                    :key="row.name"
                    class="tier__row">
                    <span class="tier__name">{{ row.name }}</span>
                    <span class="tier__count">{{ row.count }}</span>
                    <span class="tier__return tier__return--negative">{{ formatRatio(row.averageReturn) }}</span>
                </li>
            </ol>
        </section>
    </div>
</template>

<style lang="scss" scoped>
.tier {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 1em;
}

.tier__column {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
}

.tier__title {
    margin: 0;
    font-size: $font-size-xs;
    font-weight: $font-weight-regular;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.tier__list {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.tier__row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.5em;
    align-items: baseline;
    font-size: $font-size-sm;
}

.tier__name {
    overflow: hidden;
    color: $color-text;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tier__count {
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.tier__return {
    font-family: $font-mono;
    font-variant-numeric: tabular-nums;
}

.tier__return--positive {
    color: $color-positive;
}

.tier__return--negative {
    color: $color-negative;
}
</style>

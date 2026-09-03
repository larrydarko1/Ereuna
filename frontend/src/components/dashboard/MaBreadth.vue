<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BREADTH_UNIVERSES, type BreadthUniverse, type MovingAverageBreadth } from '@ereuna/shared';
import { formatNumber } from '@/utils/formatters';

const { series } = defineProps<{
    series: Record<BreadthUniverse, MovingAverageBreadth[]>;
}>();

const { t } = useI18n();

const universe = ref<BreadthUniverse>('all');

const rows = computed(() => series[universe.value] ?? []);
</script>

<template>
    <div class="ma-breadth">
        <label class="ma-breadth__filter">
            <span class="visually-hidden">{{ t('dashboard.sma.universe') }}</span>
            <select v-model="universe" class="form-input">
                <option v-for="option in BREADTH_UNIVERSES" :key="option" :value="option">
                    {{ t(`dashboard.universe.${option}`) }}
                </option>
            </select>
        </label>

        <p v-if="rows.length === 0" class="ma-breadth__empty">{{ t('dashboard.noData') }}</p>

        <ul v-else class="ma-breadth__list">
            <li v-for="row in rows" :key="row.period" class="ma-breadth__row">
                <span class="ma-breadth__period">{{ t('dashboard.sma.period', { period: row.period }) }}</span>
                <span
                    class="ma-breadth__bar"
                    role="img"
                    :aria-label="
                        t('dashboard.sma.reading', {
                            above: formatNumber(row.above * 100, 1),
                            below: formatNumber(row.below * 100, 1),
                        })
                    "
                >
                    <span class="ma-breadth__fill ma-breadth__fill--above" :style="{ width: `${row.above * 100}%` }" />
                    <span class="ma-breadth__fill ma-breadth__fill--below" :style="{ width: `${row.below * 100}%` }" />
                </span>
                <span class="ma-breadth__values">
                    <span class="ma-breadth__above">{{ formatNumber(row.above * 100, 0) }}%</span>
                    <span class="ma-breadth__below">{{ formatNumber(row.below * 100, 0) }}%</span>
                </span>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
.ma-breadth {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}

.ma-breadth__filter {
    align-self: flex-start;
}

.ma-breadth__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.ma-breadth__list {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.ma-breadth__row {
    display: grid;
    grid-template-columns: 4.5rem 1fr 4.5rem;
    gap: 0.6em;
    align-items: center;
}

.ma-breadth__period {
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.ma-breadth__bar {
    display: flex;
    overflow: hidden;
    width: 100%;
    height: 8px;
    border-radius: $radius-pill;
    background: $color-sunken;
}

.ma-breadth__fill {
    height: 100%;
}

.ma-breadth__fill--above {
    background: $color-positive;
}

.ma-breadth__fill--below {
    background: $color-negative;
}

.ma-breadth__values {
    display: flex;
    justify-content: space-between;
    font-family: $font-mono;
    font-size: $font-size-xs;
}

.ma-breadth__above {
    color: $color-positive;
}

.ma-breadth__below {
    color: $color-negative;
}
</style>

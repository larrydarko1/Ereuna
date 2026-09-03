<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { BenchmarkResult } from '@/api/portfolio';
import { direction, formatPercent } from '@/utils/formatters';

defineProps<{ benchmarks: readonly BenchmarkResult[] }>();
const emit = defineEmits<{ edit: [] }>();

const { t } = useI18n();
</script>

<template>
    <section class="benchmark-strip">
        <header class="benchmark-strip__header">
            <h2 class="benchmark-strip__title">{{ t('portfolio.benchmark') }}</h2>
            <button type="button" class="btn btn--small" @click="emit('edit')">
                {{ t('portfolio.editBenchmarks') }}
            </button>
        </header>

        <div v-if="benchmarks.length > 0" class="benchmark-strip__cards">
            <article v-for="entry in benchmarks" :key="entry.symbol" class="benchmark-strip__card">
                <header class="benchmark-strip__card-header">
                    <span class="benchmark-strip__symbol">{{ entry.symbol }}</span>
                    <span
                        class="benchmark-strip__badge"
                        :class="`benchmark-strip__badge--${direction(entry.outperformance)}`"
                    >
                        {{ entry.outperformance >= 0 ? t('portfolio.beating') : t('portfolio.lagging') }}
                    </span>
                </header>

                <dl class="benchmark-strip__stats">
                    <div class="benchmark-strip__stat">
                        <dt>{{ t('portfolio.benchmark') }}</dt>
                        <dd :class="`benchmark-strip__value--${direction(entry.returnPercent)}`">
                            {{ formatPercent(entry.returnPercent) }}
                        </dd>
                    </div>
                    <div class="benchmark-strip__stat">
                        <dt>{{ t('portfolio.title') }}</dt>
                        <dd :class="`benchmark-strip__value--${direction(entry.portfolioReturnPercent)}`">
                            {{ formatPercent(entry.portfolioReturnPercent) }}
                        </dd>
                    </div>
                    <div class="benchmark-strip__stat">
                        <dt>{{ t('portfolio.diff') }}</dt>
                        <dd :class="`benchmark-strip__value--${direction(entry.outperformance)}`">
                            {{ formatPercent(entry.outperformance) }}
                        </dd>
                    </div>
                </dl>
            </article>
        </div>

        <p v-else class="form-hint">{{ t('portfolio.noBenchmarkData') }}</p>
    </section>
</template>

<style lang="scss" scoped>
.benchmark-strip {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}

.benchmark-strip__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
}

.benchmark-strip__title {
    margin: 0;
    font-size: $font-size-md;
    color: $color-text;
}

.benchmark-strip__cards {
    display: flex;
    gap: 0.75em;

    // Benchmarks are capped at five, so a row that scrolls beats a grid
    // that reflows one card onto a line of its own.
    overflow-x: auto;
}

.benchmark-strip__card {
    min-width: 200px;
    flex: 1 0 auto;
    padding: 0.6em 0.8em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.benchmark-strip__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    margin-bottom: 0.4em;
}

.benchmark-strip__symbol {
    font-weight: $font-weight-medium;
    color: $color-text;
}

.benchmark-strip__badge {
    padding: 0.1em 0.5em;
    border-radius: $radius-pill;
    font-size: $font-size-xs;

    &--up {
        background: color-mix(in srgb, $color-positive 15%, transparent);
        color: $color-positive;
    }

    &--down,
    &--flat {
        background: color-mix(in srgb, $color-negative 15%, transparent);
        color: $color-negative;
    }
}

.benchmark-strip__stats {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    margin: 0;
}

.benchmark-strip__stat {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    font-size: $font-size-xs;

    dt {
        color: $color-text-muted;
    }

    dd {
        margin: 0;
        font-family: $font-mono;
        color: $color-text;
    }
}

.benchmark-strip__value {
    &--up {
        color: $color-positive;
    }

    &--down {
        color: $color-negative;
    }
}
</style>

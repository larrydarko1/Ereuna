<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { PORTFOLIO_SLOTS } from '@/composables/portfolio/usePortfolios';

defineProps<{
    selected: number;
    opened: Set<number>;
    blank: boolean;
}>();

const emit = defineEmits<{
    select: [slot: number];
    trade: [];
    cash: [];
    settings: [];
    import: [];
    export: [];
    reset: [];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="portfolio-tabs">
        <div class="portfolio-tabs__slots" role="tablist" :aria-label="t('portfolio.selectPortfolio')">
            <button
                v-for="slot in PORTFOLIO_SLOTS"
                :key="slot"
                type="button"
                role="tab"
                class="portfolio-tabs__slot"
                :class="{
                    'portfolio-tabs__slot--active': selected === slot - 1,
                    'portfolio-tabs__slot--opened': opened.has(slot - 1),
                }"
                :aria-selected="selected === slot - 1"
                @click="emit('select', slot - 1)"
            >
                {{ slot }}
            </button>
        </div>

        <div class="portfolio-tabs__actions">
            <button type="button" class="btn" @click="emit('trade')">
                {{ t('portfolio.newTrade') }}
            </button>
            <button type="button" class="btn" @click="emit('cash')">
                {{ t('portfolio.cash') }}
            </button>
            <button type="button" class="btn" @click="emit('settings')">
                {{ t('portfolio.settings') }}
            </button>
            <button type="button" class="btn" :disabled="!blank" @click="emit('import')">
                {{ t('portfolio.import') }}
            </button>
            <button type="button" class="btn" :disabled="blank" @click="emit('export')">
                {{ t('portfolio.export') }}
            </button>
            <button
                type="button"
                class="btn btn--danger"
                :disabled="blank"
                @click="emit('reset')"
            >
                {{ t('portfolio.reset') }}
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.portfolio-tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75em;

    &__slots {
        display: flex;
        gap: 0.25em;
    }

    &__slot {
        width: 32px;
        height: 32px;
        border: $border-width solid $color-elevated;
        border-radius: $radius-sm;
        background: $color-surface;
        color: $color-text-muted;
        font-size: $font-size-sm;
        cursor: pointer;
        transition: all $duration-fast $ease-out;

        &:hover {
            border-color: $color-accent-1;
        }

        // An opened slot is marked, so the ten buttons say which hold something.
        &--opened {
            color: $color-text;
            font-weight: $font-weight-medium;
        }

        &--active {
            border-color: $color-accent-1;
            background: $color-accent-1;
            color: $color-text-inverted;
        }
    }

    &__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
    }
}
</style>

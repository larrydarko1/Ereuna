<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { MarketStatus } from '@/composables/charts/useMarketStatus';
import type { ChartQuote, OverlayLabel } from '@/constants/chart';
import { formatNumber, formatPercent, formatSigned } from '@/utils/formatters';

const {
    quote = null,
    overlays = [],
    status,
    holidayName = null,
    statusPending = false,
    priceOnly = false,
    badges = [],
} = defineProps<{
    quote?: ChartQuote | null;
    overlays?: readonly OverlayLabel[];
    status: MarketStatus;
    holidayName?: string | null;
    statusPending?: boolean;
    priceOnly?: boolean; // Line, area and baseline charts have one price to show, not four.
    badges?: readonly string[]; // Short flags about the instrument itself — delisted, hidden, EOD only.
}>();

const { t } = useI18n();

const FIELDS = ['open', 'high', 'low', 'close'] as const;
</script>

<template>
    <div class="legend">
        <dl v-if="quote !== null" class="legend__quote">
            <template v-if="priceOnly">
                <dt class="legend__term">{{ t('charts.quote.price') }}</dt>
                <dd class="legend__value">{{ formatNumber(quote.close) }}</dd>
            </template>
            <template v-else>
                <template v-for="field in FIELDS" :key="field">
                    <dt class="legend__term">{{ t(`charts.quote.${field}`) }}</dt>
                    <dd class="legend__value">{{ formatNumber(quote[field]) }}</dd>
                </template>
            </template>

            <dt class="legend__term">{{ t('charts.quote.change') }}</dt>
            <dd class="legend__value" :class="quote.change >= 0 ? 'legend__value--up' : 'legend__value--down'">
                {{ formatSigned(quote.change) }} ({{ formatPercent(quote.changePercent) }})
            </dd>
        </dl>

        <ul v-if="overlays.length > 0" class="legend__overlays">
            <li v-for="overlay in overlays" :key="overlay.label" :style="{ color: overlay.color }">
                {{ overlay.label }}
            </li>
        </ul>

        <div class="legend__flags">
            <span v-for="badge in badges" :key="badge" class="legend__badge">{{ badge }}</span>

            <span v-if="!statusPending" class="legend__status" :class="`legend__status--${status}`">
                {{ status === 'holiday' && holidayName !== null
                    ? `${t('charts.market.holiday')} · ${holidayName}`
                    : t(`charts.market.${status}`) }}
            </span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-1 $space-3;
    font-size: $font-size-xs;
}

.legend__quote {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: $space-1;
    margin: 0;
    font-variant-numeric: tabular-nums;
}

.legend__term {
    color: $color-text-muted;

    &::after {
        content: ':';
    }
}

.legend__value {
    margin: 0 $space-2 0 0;
}

.legend__value--up {
    color: $color-positive;
}

.legend__value--down {
    color: $color-negative;
}

.legend__overlays {
    display: flex;
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
}

.legend__flags {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-left: auto;
}

.legend__badge {
    padding: 0 $space-1;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    color: $color-text-muted;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.legend__status {
    display: flex;
    align-items: center;
    gap: $space-1;
    color: $color-text-muted;

    &::before {
        width: 8px;
        height: 8px;
        border-radius: $radius-pill;
        background: currentcolor;
        content: '';
    }
}

.legend__status--open {
    color: $color-positive;
}

.legend__status--closed {
    color: $color-text-muted;
}

.legend__status--holiday {
    color: $color-accent-2;
}
</style>

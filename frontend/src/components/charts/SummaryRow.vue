<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SummaryFormat } from '@/constants/summaryFields';
import { formatCompact, formatDate, formatNumber } from '@/utils/formatters';

const { label, value, format } = defineProps<{
    label: string;
    value: string | number | null;
    format: SummaryFormat;
}>();

const { t } = useI18n();

const PLACEHOLDER = '—';

const copied = ref(false);
const expanded = ref(false);

const display = computed(() => {
    if (value === null || value === '') return PLACEHOLDER;

    if (typeof value === 'number') {
        switch (format) {
            case 'integer':
                return formatNumber(value, 0);
            case 'compact':
                return formatCompact(value);
            case 'percent':
                return `${formatNumber(value, 2)}%`;
            case 'ratio':
                // Stored as a fraction, read as a percentage: 0.032 → 3.20%.
                return `${formatNumber(value * 100, 2)}%`;
            default:
                return formatNumber(value, 2);
        }
    }

    return format === 'date' ? formatDate(value) : value;
});

/**
 * The value as a link, or null when it is not one we will follow.
 * `website` comes out of the reference data, and an href is executed by the
 * browser: only http and https are allowed through, so a stored `javascript:`
 * URL renders as text instead of becoming a click-to-run script.
 */
const href = computed(() => {
    if (format !== 'link' || typeof value !== 'string') return null;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    try {
        const url = new URL(candidate);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
});

async function copy(): Promise<void> {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    try {
        await navigator.clipboard.writeText(String(value));
        copied.value = true;
        setTimeout(() => {
            copied.value = false;
        }, 2000);
    } catch {
        // No clipboard permission, or an insecure origin. The value is on
        // screen and selectable either way, so there is nothing to report.
    }
}
</script>

<template>
    <div v-if="format === 'prose'" class="summary-row summary-row--prose">
        <p class="summary-row__prose" :class="{ 'summary-row__prose--expanded': expanded }">{{ display }}</p>
        <button
            v-if="value !== null"
            type="button"
            class="summary-row__toggle"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
        >
            {{ expanded ? t('summary.showLess') : t('summary.showAll') }}
        </button>
    </div>

    <div v-else class="summary-row">
        <span class="summary-row__label">{{ label }}</span>

        <a
            v-if="href !== null"
            class="summary-row__value summary-row__link"
            :href="href"
            target="_blank"
            rel="noopener noreferrer"
        >
            {{ display }}
        </a>

        <span v-else class="summary-row__value">
            {{ display }}
            <button
                v-if="format === 'copyable' && value !== null"
                type="button"
                class="summary-row__copy"
                :aria-label="t('summary.copyToClipboard')"
                @click="copy"
            >
                {{ copied ? '✓' : '⧉' }}
            </button>
        </span>
    </div>
</template>

<style lang="scss" scoped>
.summary-row {
    display: flex;
    gap: $space-3;
    align-items: baseline;
    justify-content: space-between;
    padding: $space-1 0;
    font-size: $font-size-sm;
}

.summary-row__label {
    flex: none;
    color: $color-text-muted;
}

.summary-row__value {
    display: inline-flex;
    gap: $space-1;
    align-items: center;
    min-width: 0;
    overflow: hidden;
    color: $color-text;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.summary-row__link {
    text-decoration: underline;

    &:hover {
        color: $color-accent-1;
    }
}

.summary-row__copy {
    border: none;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}

.summary-row--prose {
    flex-direction: column;
    align-items: stretch;
    gap: $space-1;
}

.summary-row__prose {
    margin: 0;
    overflow: hidden;
    color: $color-text-muted;
    font-size: $font-size-sm;
    line-height: $line-height-body;

    // Clamping to lines rather than a fixed pixel height means the collapsed
    // state stays right when the user's text size is not the one we assumed.
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
}

.summary-row__prose--expanded {
    -webkit-line-clamp: unset;
    line-clamp: unset;
}

.summary-row__toggle {
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    color: $color-accent-1;
    font-size: $font-size-xs;
    cursor: pointer;
}
</style>

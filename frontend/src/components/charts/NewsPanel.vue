<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getNews, type NewsRow } from '@/api/market';
import { useResource } from '@/composables/data/useResource';
import { timeAgo } from '@/utils/formatters';

const { symbol, limit = 6 } = defineProps<{
    symbol: string;
    limit?: number;
}>();

const { t } = useI18n();

const { data, pending, error } = useResource(
    () => symbol,
    async (current) => (await getNews({ symbols: [current], limit })).data.items,
    { enabled: (current) => current !== '' },
);

type Headline = NewsRow & { href: string };

/**
 * The articles we will actually link to.
 * An href is executed by the browser and these URLs come from an outside feed,
 * so anything that is not http or https is dropped rather than rendered as a
 * click-to-run `javascript:` link.
 */
const headlines = computed<Headline[]>(() =>
    (data.value ?? []).flatMap((row) => {
        const href = safeUrl(row.url);
        return href === null ? [] : [{ ...row, href }];
    }),
);

function safeUrl(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}
</script>

<template>
    <p v-if="pending" class="news__note">{{ t('sidebar.loading') }}</p>
    <p v-else-if="error !== null" class="news__note">{{ error }}</p>
    <p v-else-if="headlines.length === 0" class="news__note">{{ t('sidebar.noNewsAvailable') }}</p>

    <ul v-else class="news">
        <li v-for="headline in headlines" :key="headline.href" class="news__item">
            <a class="news__link" :href="headline.href" target="_blank" rel="noopener noreferrer">
                {{ headline.title }}
            </a>
            <p class="news__meta">
                <span v-if="headline.source !== null">{{ headline.source }}</span>
                <time :datetime="headline.publishedDate">{{ timeAgo(headline.publishedDate) }}</time>
            </p>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
.news {
    margin: 0;
    padding: 0;
    list-style: none;
}

.news__item + .news__item {
    margin-top: $space-2;
    padding-top: $space-2;
    border-top: $border-width solid $color-elevated;
}

.news__link {
    color: $color-text;
    font-size: $font-size-sm;
    line-height: $line-height-body;

    &:hover {
        color: $color-accent-1;
    }
}

.news__meta {
    display: flex;
    gap: $space-2;
    margin: $space-1 0 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.news__note {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>

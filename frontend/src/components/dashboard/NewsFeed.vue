<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getNews, type NewsRow } from '@/api/market';
import { useResource } from '@/composables/data/useResource';
import { timeAgo } from '@/utils/formatters';
import { externalUrl } from '@/utils/url';

type Headline = NewsRow & { href: string };

const { limit = 12 } = defineProps<{ limit?: number }>();

const { t } = useI18n();

// Market-wide rather than per symbol: this is the whole feed, not a chart's
const { data, pending, error } = useResource(
    () => limit,
    async (count) => (await getNews({ limit: count })).data.items,
);

const headlines = computed<Headline[]>(() =>
    (data.value ?? []).flatMap((row) => {
        const href = externalUrl(row.url);
        return href === null ? [] : [{ ...row, href }];
    }),
);
</script>

<template>
    <p v-if="pending" class="news__note">{{ t('dashboard.loading') }}</p>
    <p v-else-if="error !== null" class="news__note" role="alert">{{ error }}</p>
    <p v-else-if="headlines.length === 0" class="news__note">{{ t('dashboard.noData') }}</p>

    <ul v-else class="news">
        <li v-for="headline in headlines" :key="headline.href" class="news__item">
            <a class="news__link" :href="headline.href" target="_blank" rel="noopener noreferrer">
                {{ headline.title }}
            </a>
            <p class="news__meta">
                <span v-if="headline.source !== null">{{ headline.source }}</span>
                <time :datetime="headline.publishedDate">{{ timeAgo(headline.publishedDate) }}</time>
                <span v-if="headline.tickers.length > 0" class="news__tickers">
                    {{ headline.tickers.slice(0, 4).join(' · ') }}
                </span>
            </p>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
.news {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: 0.75em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.news__item {
    padding: 0.6em 0.8em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
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
    flex-wrap: wrap;
    gap: 0.5em;
    margin: 0.35em 0 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.news__tickers {
    font-family: $font-mono;
}

.news__note {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>

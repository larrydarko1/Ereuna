<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import { useWatchlists } from '@/composables/charts/useWatchlists';

const { symbol } = defineProps<{ symbol: string }>();

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { lists, loaded, pending, load, toggleMembership } = useWatchlists();

const busy = ref<string | null>(null);
const error = ref<string | null>(null);

async function toggle(name: string): Promise<void> {
    busy.value = name;
    error.value = null;
    try {
        await toggleMembership(name, symbol);
    } catch {
        error.value = t('screener.watchlistFailed');
    } finally {
        busy.value = null;
    }
}

onMounted(async () => {
    // The chart view may already hold them; `load` is a no-op when it does.
    if (!loaded.value) await load();
});
</script>

<template>
    <AppDialog
        :title="t('screener.watchlistTitle', { symbol })"
        size="sm"
        @close="emit('close')">
        <p
            v-if="lists.length === 0 && !pending"
            class="watchlist-dialog__empty"
            >{{ t('screener.watchlistNone') }}</p
        >

        <ul
            v-else
            class="watchlist-dialog__list">
            <li
                v-for="list in lists"
                :key="list.id">
                <button
                    type="button"
                    class="watchlist-dialog__item"
                    :disabled="busy !== null"
                    :aria-pressed="list.tickers.includes(symbol)"
                    @click="toggle(list.name)">
                    <span class="watchlist-dialog__check">
                        <AppIcon
                            v-if="list.tickers.includes(symbol)"
                            name="check"
                            :size="14" />
                    </span>
                    <span class="watchlist-dialog__name">{{ list.name }}</span>
                    <span class="watchlist-dialog__count">{{ list.tickerCount }}</span>
                </button>
            </li>
        </ul>

        <p
            v-if="error !== null"
            class="watchlist-dialog__error"
            role="alert"
            >{{ error }}</p
        >

        <template #footer>
            <button
                type="button"
                class="btn"
                @click="emit('close')"
                >{{ t('common.close') }}</button
            >
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
/* –––––– List –––––– */

.watchlist-dialog__list {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    max-height: 320px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
}

.watchlist-dialog__item {
    display: flex;
    gap: $space-2;
    align-items: center;
    width: 100%;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: $color-elevated;
    }

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }
}

.watchlist-dialog__check {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: $border-width solid $color-text-muted;
    border-radius: $radius-sm;
    color: $color-accent-1;
}

.watchlist-dialog__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.watchlist-dialog__count {
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}

/* –––––– Messages –––––– */

.watchlist-dialog__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.watchlist-dialog__error {
    margin: $space-3 0 0;
    color: $color-negative;
    font-size: $font-size-sm;
}
</style>

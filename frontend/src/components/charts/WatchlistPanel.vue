<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiErrorMessage } from '@/api/client';
import AppDialog from '@/components/ui/AppDialog.vue';
import PromptDialog from '@/components/ui/PromptDialog.vue';
import { useWatchlists } from '@/composables/charts/useWatchlists';
import { formatNumber, formatPercent } from '@/utils/formatters';

type Prompt = 'create' | 'rename' | null;

const { symbol = '' } = defineProps<{ symbol?: string }>();

const emit = defineEmits<{ select: [symbol: string] }>();

/** The API's per-list ceiling, so a file with more is refused before any write. */
const MAX_IMPORT = 100;

const { t } = useI18n();
const {
    lists,
    activeName,
    rows,
    pending,
    isEmpty,
    load,
    open,
    create,
    rename,
    remove,
    addTicker,
    addTickers,
    removeTicker,
    reorderTickers,
} = useWatchlists();

const prompt = ref<Prompt>(null);
const confirmingDelete = ref(false);
const draftSymbol = ref('');
const busy = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

const tickers = computed(() => rows.value.map((row) => row.ticker));

/** Every write goes through here, so one place reports failure and clears it. */
async function run(action: () => Promise<void>): Promise<void> {
    busy.value = true;
    error.value = null;
    try {
        await action();
    } catch (err) {
        error.value = apiErrorMessage(err, t('watchlist.actionFailed'));
    } finally {
        busy.value = false;
    }
}

async function submitPrompt(value: string): Promise<void> {
    const mode = prompt.value;
    const current = activeName.value;
    await run(async () => {
        if (mode === 'create') await create(value);
        else if (mode === 'rename' && current !== null) await rename(current, value);
    });
    if (error.value === null) prompt.value = null;
}

async function confirmDelete(): Promise<void> {
    const current = activeName.value;
    if (current === null) return;
    await run(() => remove(current));
    confirmingDelete.value = false;
}

async function submitSymbol(): Promise<void> {
    const value = draftSymbol.value.trim().toUpperCase();
    if (value === '') return;
    await run(() => addTicker(value));
    if (error.value === null) draftSymbol.value = '';
}

function moveRow(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= tickers.value.length) return;
    const next = [...tickers.value];
    next.splice(target, 0, ...next.splice(index, 1));
    void run(() => reorderTickers(next));
}

async function importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // So picking the same file twice fires again.
    if (file === undefined) return;

    notice.value = null;
    const text = await file.text();
    const symbols = [
        ...new Set(
            text
                .split(/[\s,;]+/u)
                .map((entry) => entry.trim().toUpperCase())
                .filter((entry) => entry !== ''),
        ),
    ];

    if (symbols.length === 0) {
        error.value = t('watchlist.noSymbolsInFile');
        return;
    }
    if (symbols.length > MAX_IMPORT) {
        error.value = t('watchlist.tooManySymbols', { max: MAX_IMPORT });
        return;
    }

    await run(async () => {
        const result = await addTickers(symbols);
        notice.value = t('watchlist.imported', { added: result.added, skipped: result.rejected.length });
    });
}

function exportList(): void {
    if (activeName.value === null) return;
    const blob = new Blob([tickers.value.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeName.value}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
}

const changeTone = (value: number | null): string =>
    value === null || value === 0 ? '' : value > 0 ? 'watchlist__change--up' : 'watchlist__change--down';

onMounted(() => {
    void run(() => load());
});
</script>

<template>
    <section class="watchlist" :aria-label="t('watchlist.title')">
        <header class="watchlist__header">
            <label class="watchlist__picker-label" for="watchlist-picker">{{ t('watchlist.myWatchlists') }}</label>
            <select
                id="watchlist-picker"
                class="watchlist__picker"
                :value="activeName ?? ''"
                :disabled="lists.length === 0"
                @change="run(() => open(($event.target as HTMLSelectElement).value))"
            >
                <option v-for="list in lists" :key="list.id" :value="list.name">
                    {{ list.name }} ({{ list.tickerCount }})
                </option>
            </select>

            <div class="watchlist__tools">
                <button type="button" :disabled="busy" @click="prompt = 'create'">{{ t('watchlist.create') }}</button>
                <button type="button" :disabled="busy || activeName === null" @click="prompt = 'rename'">
                    {{ t('watchlist.rename') }}
                </button>
                <button type="button" :disabled="busy || activeName === null" @click="confirmingDelete = true">
                    {{ t('common.delete') }}
                </button>
                <button type="button" :disabled="busy || activeName === null" @click="fileInput?.click()">
                    {{ t('common.import') }}
                </button>
                <button type="button" :disabled="activeName === null || rows.length === 0" @click="exportList">
                    {{ t('common.export') }}
                </button>
                <input
                    ref="fileInput"
                    class="watchlist__file"
                    type="file"
                    accept=".txt,text/plain"
                    @change="importFile"
                />
            </div>
        </header>

        <form v-if="activeName !== null" class="watchlist__add" @submit.prevent="submitSymbol">
            <label class="watchlist__add-label" for="watchlist-add">{{ t('watchlist.addSymbol') }}</label>
            <input
                id="watchlist-add"
                v-model="draftSymbol"
                class="watchlist__add-input"
                type="text"
                autocapitalize="characters"
                :placeholder="t('watchlist.symbolPlaceholder')"
            />
            <button type="submit" :disabled="busy || draftSymbol.trim() === ''">{{ t('common.add') }}</button>
        </form>

        <p v-if="error !== null" class="watchlist__message watchlist__message--error" role="alert">{{ error }}</p>
        <p v-else-if="notice !== null" class="watchlist__message" role="status">{{ notice }}</p>

        <p v-if="pending && rows.length === 0" class="watchlist__message">{{ t('sidebar.loading') }}</p>
        <p v-else-if="isEmpty" class="watchlist__message">{{ t('watchlist.noWatchlists') }}</p>
        <p v-else-if="rows.length === 0" class="watchlist__message">{{ t('watchlist.noSymbols') }}</p>

        <ul v-else class="watchlist__rows">
            <li
                v-for="(row, index) in rows"
                :key="row.ticker"
                class="watchlist__row"
                :class="{ 'watchlist__row--active': row.ticker === symbol }"
            >
                <button type="button" class="watchlist__symbol" @click="emit('select', row.ticker)">
                    <span class="watchlist__ticker">{{ row.ticker }}</span>
                    <span class="watchlist__price">
                        {{ row.quote === null ? '—' : formatNumber(row.quote.close, 2) }}
                    </span>
                    <span class="watchlist__change" :class="changeTone(row.quote?.changePercent ?? null)">
                        {{ row.quote?.changePercent == null ? '' : formatPercent(row.quote.changePercent) }}
                    </span>
                </button>

                <button
                    type="button"
                    class="watchlist__icon"
                    :aria-label="t('watchlist.moveUp', { symbol: row.ticker })"
                    :disabled="index === 0 || busy"
                    @click="moveRow(index, -1)"
                >
                    <span aria-hidden="true">↑</span>
                </button>
                <button
                    type="button"
                    class="watchlist__icon"
                    :aria-label="t('watchlist.moveDown', { symbol: row.ticker })"
                    :disabled="index === rows.length - 1 || busy"
                    @click="moveRow(index, 1)"
                >
                    <span aria-hidden="true">↓</span>
                </button>
                <button
                    type="button"
                    class="watchlist__icon"
                    :aria-label="t('watchlist.removeSymbol', { symbol: row.ticker })"
                    :disabled="busy"
                    @click="run(() => removeTicker(row.ticker))"
                >
                    <span aria-hidden="true">✕</span>
                </button>
            </li>
        </ul>

        <PromptDialog
            v-if="prompt !== null"
            :title="prompt === 'create' ? t('watchlist.create') : t('watchlist.rename')"
            :label="t('watchlist.name')"
            :initial="prompt === 'rename' ? (activeName ?? '') : ''"
            :pending="busy"
            :error="error"
            @submit="submitPrompt"
            @close="prompt = null"
        />

        <AppDialog v-if="confirmingDelete" :title="t('watchlist.confirmDelete')" size="sm" @close="confirmingDelete = false">
            <p class="watchlist__confirm">{{ t('watchlist.confirmDeleteBody', { name: activeName ?? '' }) }}</p>
            <template #footer>
                <button type="button" @click="confirmingDelete = false">{{ t('common.cancel') }}</button>
                <button type="button" class="watchlist__danger" :disabled="busy" @click="confirmDelete">
                    {{ t('common.delete') }}
                </button>
            </template>
        </AppDialog>
    </section>
</template>

<style lang="scss" scoped>
.watchlist {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding: $space-2;
    border-radius: $radius-md;
    background: $color-surface;
}

.watchlist__header {
    display: flex;
    flex-direction: column;
    gap: $space-1;
}

.watchlist__picker-label,
.watchlist__add-label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.watchlist__picker,
.watchlist__add-input {
    width: 100%;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: $font-size-sm;
}

.watchlist__tools {
    display: flex;
    flex-wrap: wrap;
    gap: $space-1;

    button {
        padding: $space-1 $space-2;
        border: $border-width solid $color-elevated;
        border-radius: $radius-sm;
        background: none;
        color: $color-text-muted;
        font-size: $font-size-xs;
        cursor: pointer;

        &:hover:not(:disabled) {
            color: $color-text;
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }
}

// Hidden but focusable is a trap; the button above opens it, so it is neither.
.watchlist__file {
    display: none;
}

.watchlist__add {
    display: flex;
    flex-wrap: wrap;
    gap: $space-1;
    align-items: center;

    button {
        padding: $space-1 $space-3;
        border: none;
        border-radius: $radius-sm;
        background: $color-accent-1;
        color: $color-text-inverted;
        font-size: $font-size-xs;
        cursor: pointer;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }
}

.watchlist__add-input {
    flex: 1;
    min-width: 96px;
}

.watchlist__message {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.watchlist__message--error {
    color: $color-negative;
}

.watchlist__rows {
    margin: 0;
    padding: 0;
    list-style: none;
}

.watchlist__row {
    display: flex;
    gap: $space-1;
    align-items: center;
    border-radius: $radius-sm;

    &:hover {
        background: $color-elevated;
    }
}

.watchlist__row--active {
    background: $color-elevated;
}

.watchlist__symbol {
    display: flex;
    flex: 1;
    gap: $space-2;
    align-items: baseline;
    min-width: 0;
    padding: $space-1 $space-2;
    border: none;
    background: none;
    color: $color-text;
    font-size: $font-size-sm;
    text-align: start;
    cursor: pointer;
}

.watchlist__ticker {
    flex: 1;
    overflow: hidden;
    font-weight: $font-weight-medium;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.watchlist__price,
.watchlist__change {
    font-variant-numeric: tabular-nums;
}

.watchlist__change--up {
    color: $color-positive;
}

.watchlist__change--down {
    color: $color-negative;
}

.watchlist__icon {
    flex: none;
    width: 24px;
    border: none;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover:not(:disabled) {
        color: $color-text;
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
}

.watchlist__confirm {
    margin: 0;
    color: $color-text;
    font-size: $font-size-sm;
}

.watchlist__danger {
    padding: $space-1 $space-3;
    border: none;
    border-radius: $radius-sm;
    background: $color-negative;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;
}
</style>

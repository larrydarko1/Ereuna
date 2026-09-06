<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import AssetLogo from '@/components/ui/AssetLogo.vue';
import { searchAssets, type AssetSummary } from '@/api/chart';
import { apiErrorMessage } from '@/api/client';
import { useDebounceFn } from '@/composables/ui/useDebounce';

const emit = defineEmits<{ select: [symbol: string] }>();

const MIN_TERM = 1;
const DEBOUNCE_MS = 220;

const { t } = useI18n();

const term = ref('');
const results = ref<AssetSummary[]>([]);
const active = ref(-1);
const pending = ref(false);
const error = ref<string | null>(null);
const open = ref(false);
const searched = ref(false);

const input = useTemplateRef<HTMLInputElement>('input');
const listboxId = useId();

const hasResults = computed(() => results.value.length > 0);
const expanded = computed(
    () => open.value && (hasResults.value || pending.value || error.value !== null || searched.value),
);

let sequence = 0;

const search = useDebounceFn((query: string) => void run(query), { ms: DEBOUNCE_MS, maxWait: 1000 });

const optionId = (index: number): string => `${listboxId}-${index}`;

async function run(query: string): Promise<void> {
    const ticket = (sequence += 1);
    pending.value = true;
    error.value = null;

    try {
        const { data } = await searchAssets(query);
        if (ticket !== sequence) return; // A later keystroke already won.
        results.value = data.items;
        active.value = data.items.length > 0 ? 0 : -1;
    } catch (err) {
        if (ticket !== sequence) return;
        results.value = [];
        active.value = -1;
        error.value = apiErrorMessage(err, t('search.failed'));
    } finally {
        if (ticket === sequence) {
            pending.value = false;
            searched.value = true;
        }
    }
}

function move(delta: number): void {
    if (!hasResults.value) return;
    const count = results.value.length;
    active.value = (active.value + delta + count) % count;
}

function choose(index: number): void {
    const picked = results.value[index];
    if (picked === undefined) return;

    emit('select', picked.symbol);
    // The chosen symbol is now the chart's title; leaving it in the box as well
    // just means the next search starts by clearing it.
    term.value = '';
    results.value = [];
    active.value = -1;
    searched.value = false;
    open.value = false;
    input.value?.blur();
}

function onEnter(): void {
    if (active.value >= 0) choose(active.value);
}

function dismiss(): void {
    open.value = false;
    active.value = -1;
}

/**
 * Close once focus has left the whole widget.
 * `relatedTarget` is where focus is going; a move from the input to a result is
 * still inside, and dismissing there would unmount the option being clicked.
 */
function onFocusOut(event: FocusEvent): void {
    const container = event.currentTarget;
    const destination = event.relatedTarget;
    if (container instanceof HTMLElement && destination instanceof Node && container.contains(destination)) return;
    dismiss();
}

watch(term, (value) => {
    const query = value.trim();
    open.value = true;

    if (query.length < MIN_TERM) {
        search.cancel();
        sequence += 1; // Drop whatever is in flight; there is nothing to show it against.
        results.value = [];
        active.value = -1;
        pending.value = false;
        error.value = null;
        searched.value = false;
        return;
    }

    search(query);
});
</script>

<template>
    <div
        class="symbol-search"
        @focusout="onFocusOut">
        <label
            class="symbol-search__label"
            :for="`${listboxId}-input`"
            >{{ t('search.label') }}</label
        >

        <div class="symbol-search__control">
            <input
                :id="`${listboxId}-input`"
                ref="input"
                v-model="term"
                class="symbol-search__input"
                type="search"
                role="combobox"
                autocomplete="off"
                :placeholder="t('search.placeholder')"
                :aria-expanded="expanded"
                :aria-controls="listboxId"
                aria-autocomplete="list"
                :aria-activedescendant="active >= 0 ? optionId(active) : undefined"
                @focus="open = true"
                @keydown.down.prevent="move(1)"
                @keydown.up.prevent="move(-1)"
                @keydown.enter.prevent="onEnter"
                @keydown.esc="dismiss" />
            <AppSpinner
                v-if="pending"
                class="symbol-search__spinner"
                size="sm"
                :label="t('search.searching')" />
        </div>

        <div
            v-if="expanded"
            class="symbol-search__popover">
            <p
                v-if="error !== null"
                class="symbol-search__message"
                role="alert"
                >{{ error }}</p
            >
            <p
                v-else-if="!pending && !hasResults"
                class="symbol-search__message"
                >{{ t('search.noResults') }}</p
            >

            <ul
                :id="listboxId"
                class="symbol-search__list"
                role="listbox"
                :aria-label="t('search.resultsLabel')">
                <li
                    v-for="(result, index) in results"
                    :id="optionId(index)"
                    :key="result.symbol"
                    class="symbol-search__option"
                    :class="{ 'symbol-search__option--active': index === active }"
                    role="option"
                    :aria-selected="index === active"
                    @mousedown.prevent="choose(index)"
                    @mouseenter="active = index">
                    <AssetLogo
                        :symbol="result.symbol"
                        :exchange="result.exchange"
                        size="sm" />
                    <span class="symbol-search__ticker">{{ result.symbol }}</span>
                    <span class="symbol-search__name">{{ result.name ?? '' }}</span>
                    <span class="symbol-search__exchange">{{ result.exchange ?? '' }}</span>
                </li>
            </ul>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.symbol-search {
    position: relative;
}

.symbol-search__label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    border: 0;
    clip-path: inset(50%);
    white-space: nowrap;
}

.symbol-search__control {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding-inline-end: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.symbol-search__input {
    flex: 1;
    min-width: 0;
    padding: $space-2 $space-3;
    border: none;
    background: none;
    color: $color-text;
    font-size: $font-size-base;

    &::placeholder {
        color: $color-text-muted;
    }

    &:focus {
        outline: none;
    }
}

.symbol-search__spinner {
    flex: none;
}

.symbol-search__popover {
    position: absolute;
    z-index: $z-dropdown;
    inset-inline: 0;
    top: calc(100% + #{$space-1});
    max-height: 60vh;
    overflow-y: auto;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
    box-shadow: $shadow-md;
}

.symbol-search__message {
    margin: 0;
    padding: $space-3;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.symbol-search__list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.symbol-search__option {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: $space-2;
    align-items: center;
    padding: $space-2 $space-3;
    cursor: pointer;
}

.symbol-search__option--active {
    background: $color-elevated;
}

.symbol-search__ticker {
    color: $color-text;
    font-weight: $font-weight-bold;
}

.symbol-search__name {
    overflow: hidden;
    color: $color-text-muted;
    font-size: $font-size-sm;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.symbol-search__exchange {
    color: $color-text-muted;
    font-size: $font-size-xs;
}
</style>

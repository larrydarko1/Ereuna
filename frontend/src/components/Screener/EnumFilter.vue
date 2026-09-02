<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { options, value = null, busy = false } = defineProps<{
    options: string[];
    value?: { values: string[] } | null;
    busy?: boolean;
}>();

const emit = defineEmits<{ apply: [{ values: string[] }] }>();

const { t } = useI18n();

/** Below this a search box is more chrome than help. */
const SEARCHABLE_FROM = 12;

const selected = ref<string[]>([]);
const query = ref('');

watch(
    () => value,
    (current) => {
        selected.value = current === null ? [] : [...current.values];
    },
    { immediate: true },
);

const searchable = computed(() => options.length >= SEARCHABLE_FROM);

const visible = computed(() => {
    const needle = query.value.trim().toLowerCase();
    if (needle === '') return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
});

const dirty = computed(() => {
    const before = value?.values ?? [];
    return before.length !== selected.value.length || before.some((entry) => !selected.value.includes(entry));
});
</script>

<template>
    <div class="enum-filter">
        <input
            v-if="searchable"
            v-model="query"
            type="search"
            class="enum-filter__search"
            :placeholder="t('common.search')"
        >

        <ul class="enum-filter__list">
            <li v-for="option in visible" :key="option" class="enum-filter__item">
                <label class="enum-filter__option">
                    <input v-model="selected" type="checkbox" :value="option">
                    <span>{{ option }}</span>
                </label>
            </li>
            <li v-if="visible.length === 0" class="enum-filter__empty">{{ t('screener.noOptions') }}</li>
        </ul>

        <button
            type="button"
            class="enum-filter__apply"
            :disabled="busy || !dirty"
            @click="emit('apply', { values: selected })"
        >
            {{ t('common.apply') }}
        </button>
    </div>
</template>

<style lang="scss" scoped>
.enum-filter {
    display: flex;
    flex-direction: column;
    gap: $space-2;
}

.enum-filter__search {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-sunken;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
}

.enum-filter__list {
    max-height: 220px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
}

.enum-filter__option {
    display: flex;
    gap: $space-2;
    align-items: center;
    padding: $space-1 0;
    font-size: $font-size-sm;
    cursor: pointer;
}

.enum-filter__empty {
    padding: $space-2 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.enum-filter__apply {
    align-self: flex-start;
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-elevated;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export type ReorderableItem = { key: string; label: string };

const { items } = defineProps<{ items: readonly ReorderableItem[] }>();

/** The selected keys, in display order. */
const selected = defineModel<string[]>({ required: true });

const { t } = useI18n();

const labels = computed(() => new Map(items.map((item) => [item.key, item.label])));

const chosen = computed(() => selected.value.map((key) => ({ key, label: labels.value.get(key) ?? key })));

const available = computed(() => items.filter((item) => !selected.value.includes(item.key)));

function move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= selected.value.length) return;
    const next = [...selected.value];
    next.splice(target, 0, ...next.splice(index, 1));
    selected.value = next;
}

function add(key: string): void {
    if (selected.value.includes(key)) return;
    selected.value = [...selected.value, key];
}

function remove(key: string): void {
    selected.value = selected.value.filter((item) => item !== key);
}
</script>

<template>
    <div class="reorderable">
        <ol class="reorderable__list">
            <li v-for="(item, index) in chosen" :key="item.key" class="reorderable__row">
                <span class="reorderable__label">{{ item.label }}</span>
                <button
                    type="button"
                    class="reorderable__button"
                    :aria-label="t('panels.moveUp', { name: item.label })"
                    :disabled="index === 0"
                    @click="move(index, -1)"
                >
                    <span aria-hidden="true">↑</span>
                </button>
                <button
                    type="button"
                    class="reorderable__button"
                    :aria-label="t('panels.moveDown', { name: item.label })"
                    :disabled="index === chosen.length - 1"
                    @click="move(index, 1)"
                >
                    <span aria-hidden="true">↓</span>
                </button>
                <button
                    type="button"
                    class="reorderable__button"
                    :aria-label="t('panels.hide', { name: item.label })"
                    @click="remove(item.key)"
                >
                    <span aria-hidden="true">✕</span>
                </button>
            </li>
        </ol>

        <template v-if="available.length > 0">
            <p class="reorderable__heading">{{ t('panels.hidden') }}</p>
            <ul class="reorderable__list">
                <li v-for="item in available" :key="item.key" class="reorderable__row">
                    <span class="reorderable__label reorderable__label--muted">{{ item.label }}</span>
                    <button
                        type="button"
                        class="reorderable__button"
                        :aria-label="t('panels.show', { name: item.label })"
                        @click="add(item.key)"
                    >
                        <span aria-hidden="true">+</span>
                    </button>
                </li>
            </ul>
        </template>
    </div>
</template>

<style lang="scss" scoped>
.reorderable__list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.reorderable__row {
    display: flex;
    gap: $space-1;
    align-items: center;
    padding: $space-1 0;
}

.reorderable__label {
    flex: 1;
    min-width: 0;
    color: $color-text;
    font-size: $font-size-sm;
}

.reorderable__label--muted {
    color: $color-text-muted;
}

.reorderable__button {
    flex: none;
    width: 28px;
    height: 28px;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover:not(:disabled) {
        color: $color-text;
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
}

.reorderable__heading {
    margin: $space-3 0 $space-1;
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-weight: $font-weight-bold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}
</style>

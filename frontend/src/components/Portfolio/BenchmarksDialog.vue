<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';

const { current, error = null, saving = false } = defineProps<{
    current: readonly string[];
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{ close: []; save: [symbols: string[]] }>();

const { t } = useI18n();

/** The API's own cap. */
const MAX_BENCHMARKS = 5;

const symbols = ref<string[]>([...current]);
const draft = ref('');

const canAdd = computed(() => {
    const next = draft.value.trim().toUpperCase();
    return next !== '' && !symbols.value.includes(next) && symbols.value.length < MAX_BENCHMARKS;
});

function add(): void {
    if (!canAdd.value) return;
    symbols.value = [...symbols.value, draft.value.trim().toUpperCase()];
    draft.value = '';
}

function remove(symbol: string): void {
    symbols.value = symbols.value.filter((entry) => entry !== symbol);
}
</script>

<template>
    <AppDialog :title="t('portfolio.editBenchmarks')" size="sm" @close="emit('close')">
        <div class="benchmarks-dialog">
            <ul v-if="symbols.length > 0" class="benchmarks-dialog__list">
                <li v-for="symbol in symbols" :key="symbol" class="benchmarks-dialog__item">
                    <span>{{ symbol }}</span>
                    <button
                        type="button"
                        class="btn btn--small"
                        :aria-label="t('portfolio.removeBenchmark')"
                        @click="remove(symbol)"
                    >
                        &times;
                    </button>
                </li>
            </ul>
            <p v-else class="form-hint">{{ t('portfolio.noBenchmarks') }}</p>

            <form class="benchmarks-dialog__add" @submit.prevent="add">
                <input
                    v-model="draft"
                    class="form-input"
                    :placeholder="t('portfolio.symbol')"
                    :disabled="symbols.length >= MAX_BENCHMARKS"
                />
                <button type="submit" class="btn" :disabled="!canAdd">{{ t('portfolio.add') }}</button>
            </form>

            <p class="form-hint">{{ t('portfolio.benchmarksHint') }}</p>
            <p v-if="error !== null" class="form-error" role="alert">{{ error }}</p>
        </div>

        <template #footer>
            <button type="button" class="btn" @click="emit('close')">{{ t('common.cancel') }}</button>
            <button type="button" class="btn btn--primary" :disabled="saving" @click="emit('save', symbols)">
                {{ saving ? t('common.saving') : t('common.save') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.benchmarks-dialog {
    display: flex;
    flex-direction: column;
    gap: 0.75em;

    &__list {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    &__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.35em 0;
        border-bottom: $border-width solid $color-elevated;
        font-family: $font-mono;
        font-size: $font-size-sm;
    }

    &__add {
        display: flex;
        gap: 0.5em;
    }
}
</style>

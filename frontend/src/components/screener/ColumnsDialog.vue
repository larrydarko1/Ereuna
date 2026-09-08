<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';
import ReorderableList from '@/components/ui/ReorderableList.vue';
import { COLUMNS } from '@/constants/screener';

const { columns } = defineProps<{ columns: readonly string[] }>();

const emit = defineEmits<{ save: [columns: string[]]; close: [] }>();

const { t } = useI18n();

const selected = ref<string[]>([...columns]);
const error = ref<string | null>(null);

const items = COLUMNS.map((column) => ({ key: column.path, label: t(`screener.fields.${column.filterKey}`) }));

function save(): void {
    if (selected.value.length === 0) {
        error.value = t('screener.errorNoColumns');
        return;
    }
    emit('save', selected.value);
}
</script>

<template>
    <AppDialog
        :title="t('screener.columnsTitle')"
        size="lg"
        @close="emit('close')">
        <ReorderableList
            v-model="selected"
            :items="items" />
        <p
            v-if="error !== null"
            class="columns-dialog__error"
            role="alert"
            >{{ error }}</p
        >

        <template #footer>
            <button
                type="button"
                class="columns-dialog__button"
                @click="emit('close')"
                >{{ t('common.cancel') }}</button
            >
            <button
                type="button"
                class="columns-dialog__button columns-dialog__button--primary"
                @click="save">
                {{ t('common.save') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.columns-dialog__error {
    margin: $space-3 0 0;
    color: $color-negative;
    font-size: $font-size-sm;
}

.columns-dialog__button {
    padding: $space-2 $space-4;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
    cursor: pointer;
}

.columns-dialog__button--primary {
    border-color: $color-accent-1;
    background: $color-accent-1;
    color: $color-text-inverted;
}
</style>

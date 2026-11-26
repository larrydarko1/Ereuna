<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import ColumnsDialog from '@/components/screener/ColumnsDialog.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PromptDialog from '@/components/ui/PromptDialog.vue';
import type { ScreenerDialog } from '@/constants/screener';

const { error = null } = defineProps<{
    dialog: ScreenerDialog;
    selected: string;
    columns: readonly string[];
    error?: string | null; // Why the last attempt failed, shown in the dialog that made it
}>();

const emit = defineEmits<{
    close: [];
    create: [name: string];
    rename: [name: string];
    remove: [];
    reset: [];
    saveColumns: [columns: string[]];
}>();

const { t } = useI18n();
</script>

<template>
    <PromptDialog
        v-if="dialog === 'create'"
        :title="t('screener.createTitle')"
        :label="t('screener.nameLabel')"
        :max-length="20"
        :error="error"
        @submit="emit('create', $event)"
        @close="emit('close')" />

    <PromptDialog
        v-else-if="dialog === 'rename'"
        :title="t('screener.renameTitle')"
        :label="t('screener.nameLabel')"
        :initial="selected"
        :max-length="20"
        :error="error"
        @submit="emit('rename', $event)"
        @close="emit('close')" />

    <ConfirmDialog
        v-else-if="dialog === 'delete'"
        :title="t('screener.deleteTitle')"
        :message="t('screener.deleteMessage', { name: selected })"
        :confirm-label="t('common.delete')"
        :error="error"
        @confirm="emit('remove')"
        @close="emit('close')" />

    <AppDialog
        v-else-if="dialog === 'reset'"
        :title="t('screener.resetTitle')"
        size="sm"
        @close="emit('close')">
        <p>{{ t('screener.resetMessage') }}</p>
        <p class="screener-dialogs__warning">{{ t('screener.resetWarning') }}</p>
        <p
            v-if="error !== null"
            class="form-error"
            role="alert"
            >{{ error }}</p
        >
        <template #footer>
            <button
                type="button"
                class="btn"
                @click="emit('close')"
                >{{ t('common.cancel') }}</button
            >
            <button
                type="button"
                class="btn btn--danger"
                @click="emit('reset')">
                {{ t('screener.resetConfirm') }}
            </button>
        </template>
    </AppDialog>

    <ColumnsDialog
        v-else-if="dialog === 'columns'"
        :columns="columns"
        :error="error"
        @save="emit('saveColumns', $event)"
        @close="emit('close')" />
</template>

<style lang="scss" scoped>
/* –––––– Reset warning –––––– */

.screener-dialogs__warning {
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';

const {
    confirmLabel = null,
    cancelLabel = null,
    pending = false,
    error = null,
} = defineProps<{
    title: string;
    message: string;
    confirmLabel?: string | null;
    cancelLabel?: string | null;
    pending?: boolean;
    error?: string | null;
}>();

const emit = defineEmits<{ confirm: []; close: [] }>();

const { t } = useI18n();
</script>

<template>
    <AppDialog :title="title" size="sm" @close="emit('close')">
        <p class="confirm-dialog__message">{{ message }}</p>
        <p v-if="error !== null" class="form-error" role="alert">{{ error }}</p>

        <template #footer>
            <button type="button" class="btn" @click="emit('close')">{{ cancelLabel ?? t('common.cancel') }}</button>
            <button type="button" class="btn btn--danger" :disabled="pending" @click="emit('confirm')">
                {{ pending ? t('common.processing') : (confirmLabel ?? t('common.confirm')) }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.confirm-dialog__message {
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text;
}
</style>

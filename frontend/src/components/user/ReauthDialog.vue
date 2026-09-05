<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';
import PasswordField from '@/components/ui/PasswordField.vue';
import type { Credentials } from '@/types/user';

const {
    needsPassword = false,
    needsCode = false,
    pending = false,
    error = null,
    danger = false,
} = defineProps<{
    title: string;
    message: string;
    confirmLabel: string;
    needsPassword?: boolean;
    needsCode?: boolean;
    pending?: boolean;
    error?: string | null;
    danger?: boolean;
}>();

const emit = defineEmits<{ submit: [credentials: Credentials]; close: [] }>();

const { t } = useI18n();

const password = ref('');
const code = ref('');

const complete = computed(() => (!needsPassword || password.value !== '') && (!needsCode || code.value.trim() !== ''));

function submit(): void {
    if (!complete.value || pending) return;
    emit('submit', { password: password.value, code: code.value.trim() });
}
</script>

<template>
    <AppDialog
        :title="title"
        size="sm"
        @close="emit('close')">
        <form
            class="reauth"
            novalidate
            @submit.prevent="submit">
            <p class="reauth__message">{{ message }}</p>

            <PasswordField
                v-if="needsPassword"
                v-model="password"
                :label="t('user.password.current')"
                autocomplete="current-password" />

            <label
                v-if="needsCode"
                class="form-field">
                <span class="form-label">{{ t('user.security.code') }}</span>
                <input
                    v-model="code"
                    class="form-input reauth__code"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    :placeholder="t('user.security.codePlaceholder')" />
            </label>

            <p
                v-if="error !== null"
                class="form-error"
                role="alert"
                >{{ error }}</p
            >
        </form>

        <template #footer>
            <button
                type="button"
                class="btn"
                @click="emit('close')"
                >{{ t('common.cancel') }}</button
            >
            <button
                type="button"
                class="btn"
                :class="danger ? 'btn--danger' : 'btn--primary'"
                :disabled="pending || !complete"
                @click="submit">
                {{ pending ? t('common.processing') : confirmLabel }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.reauth {
    display: grid;
    gap: $space-3;
}

.reauth__message {
    margin: 0;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    color: $color-text;
}

.reauth__code {
    letter-spacing: 0.3em;
    text-align: center;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { setPasswordAfterRecovery } from '@/api/account';
import { logout } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import PasswordField from '@/components/ui/PasswordField.vue';
import { allValid, validatePassword, validatePasswordConfirmation } from '@/utils/validation';

const { t } = useI18n();
const router = useRouter();

const next = ref('');
const confirmation = ref('');
const pending = ref(false);
const error = ref<string | null>(null);
const submitted = ref(false);

const nextError = computed(() => (submitted.value ? validatePassword(next.value) : null));
const confirmationError = computed(() =>
    submitted.value ? validatePasswordConfirmation(next.value, confirmation.value) : null,
);

async function submit(): Promise<void> {
    submitted.value = true;
    error.value = null;
    if (pending.value) return;
    if (!allValid([nextError.value, confirmationError.value])) return;

    pending.value = true;
    try {
        await setPasswordAfterRecovery(next.value);
        // Every refresh token is revoked with the new password, so this session
        // is already dead server-side — sign in again with what was just set
        await logout();
        await router.push({ name: 'Login' });
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <AuthLayout
        :title="t('auth.setPassword.title')"
        :subtitle="t('auth.setPassword.subtitle')">
        <form
            class="set-password"
            novalidate
            @submit.prevent="submit">
            <!-- The code that got the user here is now spent; this is where they learn it -->
            <p class="form-hint">{{ t('auth.recoverySpent') }}</p>

            <PasswordField
                v-model="next"
                :label="t('auth.setPassword.new')"
                :error="nextError"
                autocomplete="new-password" />
            <PasswordField
                v-model="confirmation"
                :label="t('auth.setPassword.confirm')"
                :error="confirmationError"
                autocomplete="new-password" />

            <p
                v-if="error !== null"
                class="form-error"
                role="alert"
                >{{ error }}</p
            >

            <button
                type="submit"
                class="btn btn--primary"
                :disabled="pending">
                {{ pending ? t('common.processing') : t('auth.setPassword.submit') }}
            </button>
        </form>
    </AuthLayout>
</template>

<style lang="scss" scoped>
.set-password {
    display: flex;
    flex-direction: column;
    gap: $space-4;
}
</style>

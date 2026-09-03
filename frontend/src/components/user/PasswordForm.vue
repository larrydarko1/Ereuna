<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { changePassword } from '@/api/account';
import { logout } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import PasswordField from '@/components/ui/PasswordField.vue';
import SettingCard from '@/components/user/SettingCard.vue';
import { notifySuccess } from '@/composables/ui/useNotifications';
import { allValid, validatePassword, validatePasswordConfirmation } from '@/utils/validation';

const { t } = useI18n();
const router = useRouter();

const current = ref('');
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
    if (pending.value || current.value === '') return;
    if (!allValid([nextError.value, confirmationError.value])) return;

    pending.value = true;
    try {
        await changePassword(current.value, next.value);
        notifySuccess(t('user.password.changed'));
        // The API revokes every refresh token on a password change, so this
        // session is already dead server-side. Ending it here means the user
        // signs in again on purpose rather than being bounced mid-click
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
    <SettingCard :title="t('user.password.title')" :description="t('user.password.description')">
        <form class="password-form" novalidate @submit.prevent="submit">
            <PasswordField
                v-model="current"
                :label="t('user.password.current')"
                autocomplete="current-password"
            />
            <PasswordField
                v-model="next"
                :label="t('user.password.new')"
                :error="nextError"
                autocomplete="new-password"
            />
            <PasswordField
                v-model="confirmation"
                :label="t('user.password.confirm')"
                :error="confirmationError"
                autocomplete="new-password"
            />

            <p v-if="error !== null" class="form-error" role="alert">{{ error }}</p>

            <div>
                <button type="submit" class="btn btn--primary" :disabled="pending">
                    {{ pending ? t('common.processing') : t('user.password.submit') }}
                </button>
            </div>
        </form>
    </SettingCard>
</template>

<style lang="scss" scoped>
.password-form {
    display: grid;
    gap: $space-3;
}
</style>
